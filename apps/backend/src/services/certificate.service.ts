import PDFDocument from 'pdfkit';
import pool from '../db/postgres';
import { randomBytes } from 'crypto';

interface CertificateData {
  tournamentId: string;
  userId: string;
  teamId: string;
  tournamentName: string;
  participantName: string;
  teamName: string;
  finalRanking: number;
  tournamentDate: string;
}

interface Certificate {
  id: string;
  tournamentId: string;
  userId: string;
  teamId: string;
  certificateUrl: string;
  verificationCode: string;
  issuedAt: Date;
}

class CertificateService {
  /**
   * Generate a unique verification code
   */
  private generateVerificationCode(): string {
    return randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Generate a PDF certificate
   */
  private async generatePDF(data: CertificateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Certificate design
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Border
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(3)
        .stroke('#1e40af');

      doc
        .rect(40, 40, pageWidth - 80, pageHeight - 80)
        .lineWidth(1)
        .stroke('#1e40af');

      // Header
      doc
        .fontSize(40)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('CERTIFICATE OF PARTICIPATION', 0, 100, {
          align: 'center',
          width: pageWidth,
        });

      // Score Ocean branding
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Score Ocean', 0, 160, {
          align: 'center',
          width: pageWidth,
        });

      // Main content
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#334155')
        .text('This is to certify that', 0, 220, {
          align: 'center',
          width: pageWidth,
        });

      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(data.participantName, 0, 260, {
          align: 'center',
          width: pageWidth,
        });

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#334155')
        .text('representing', 0, 310, {
          align: 'center',
          width: pageWidth,
        });

      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text(data.teamName, 0, 340, {
          align: 'center',
          width: pageWidth,
        });

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#334155')
        .text('has successfully participated in', 0, 390, {
          align: 'center',
          width: pageWidth,
        });

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(data.tournamentName, 0, 420, {
          align: 'center',
          width: pageWidth,
        });

      // Ranking
      const rankingSuffix = (rank: number): string => {
        if (rank === 1) return 'st';
        if (rank === 2) return 'nd';
        if (rank === 3) return 'rd';
        return 'th';
      };

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text(
          `Final Position: ${data.finalRanking}${rankingSuffix(data.finalRanking)}`,
          0,
          470,
          {
            align: 'center',
            width: pageWidth,
          }
        );

      // Date
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(`Date: ${data.tournamentDate}`, 0, 520, {
          align: 'center',
          width: pageWidth,
        });

      // Footer with verification code
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(
          'This certificate can be verified at https://scoreocean.com/verify',
          0,
          pageHeight - 80,
          {
            align: 'center',
            width: pageWidth,
          }
        );

      doc.end();
    });
  }

  /**
   * Generate certificates for all participants in a tournament
   */
  async generateCertificatesForTournament(
    tournamentId: string
  ): Promise<Certificate[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get tournament details
      const tournamentResult = await client.query(
        `SELECT t.name, t.sport, t.start_date, t.end_date
         FROM tournaments t
         WHERE t.id = $1 AND t.status = 'COMPLETED'`,
        [tournamentId]
      );

      if (tournamentResult.rows.length === 0) {
        throw new Error('Tournament not found or not completed');
      }

      const tournament = tournamentResult.rows[0];
      const tournamentDate = new Date(tournament.end_date).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      );

      // Get points table to determine rankings
      const standingsResult = await client.query(
        `SELECT 
          tr.team_id,
          t.name as team_name,
          COALESCE(SUM(CASE 
            WHEN m.home_team_id = tr.team_id AND m.home_score > m.away_score THEN 3
            WHEN m.away_team_id = tr.team_id AND m.away_score > m.home_score THEN 3
            WHEN m.status = 'COMPLETED' AND m.home_score = m.away_score THEN 1
            ELSE 0
          END), 0) as points,
          COALESCE(SUM(CASE 
            WHEN m.home_team_id = tr.team_id THEN m.home_score - m.away_score
            WHEN m.away_team_id = tr.team_id THEN m.away_score - m.home_score
            ELSE 0
          END), 0) as goal_difference
         FROM tournament_registrations tr
         JOIN teams t ON tr.team_id = t.id
         LEFT JOIN matches m ON m.tournament_id = tr.tournament_id 
           AND (m.home_team_id = tr.team_id OR m.away_team_id = tr.team_id)
           AND m.status = 'COMPLETED'
         WHERE tr.tournament_id = $1 AND tr.status = 'CONFIRMED'
         GROUP BY tr.team_id, t.name
         ORDER BY points DESC, goal_difference DESC`,
        [tournamentId]
      );

      // Assign rankings
      const teamRankings = new Map<string, number>();
      standingsResult.rows.forEach((row: any, index: number) => {
        teamRankings.set(row.team_id, index + 1);
      });

      // Get all participants (players in registered teams)
      const participantsResult = await client.query(
        `SELECT DISTINCT
          u.id as user_id,
          u.email,
          up.name as participant_name,
          tr.team_id,
          t.name as team_name
         FROM tournament_registrations tr
         JOIN teams t ON tr.team_id = t.id
         JOIN team_rosters roster ON roster.team_id = t.id
         JOIN users u ON roster.player_id = u.id
         JOIN user_profiles up ON u.id = up.user_id
         WHERE tr.tournament_id = $1 AND tr.status = 'CONFIRMED'`,
        [tournamentId]
      );

      const certificates: Certificate[] = [];

      // Generate certificate for each participant
      for (const participant of participantsResult.rows) {
        const verificationCode = this.generateVerificationCode();
        const finalRanking = teamRankings.get(participant.team_id) || 0;

        // Generate PDF
        const pdfBuffer = await this.generatePDF({
          tournamentId,
          userId: participant.user_id,
          teamId: participant.team_id,
          tournamentName: tournament.name,
          participantName: participant.participant_name,
          teamName: participant.team_name,
          finalRanking,
          tournamentDate,
        });

        // In a real implementation, upload to object storage (S3, etc.)
        // For now, we'll store as base64 data URL
        const certificateUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

        // Store certificate record in database
        const certResult = await client.query(
          `INSERT INTO certificates 
           (tournament_id, user_id, team_id, certificate_url, verification_code)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, tournament_id, user_id, team_id, certificate_url, verification_code, issued_at`,
          [
            tournamentId,
            participant.user_id,
            participant.team_id,
            certificateUrl,
            verificationCode,
          ]
        );

        certificates.push({
          id: certResult.rows[0].id,
          tournamentId: certResult.rows[0].tournament_id,
          userId: certResult.rows[0].user_id,
          teamId: certResult.rows[0].team_id,
          certificateUrl: certResult.rows[0].certificate_url,
          verificationCode: certResult.rows[0].verification_code,
          issuedAt: certResult.rows[0].issued_at,
        });
      }

      await client.query('COMMIT');
      return certificates;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get certificates for a user
   */
  async getUserCertificates(userId: string): Promise<Certificate[]> {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.tournament_id,
        c.user_id,
        c.team_id,
        c.certificate_url,
        c.verification_code,
        c.issued_at,
        t.name as tournament_name,
        t.sport,
        teams.name as team_name
       FROM certificates c
       JOIN tournaments t ON c.tournament_id = t.id
       JOIN teams ON c.team_id = teams.id
       WHERE c.user_id = $1
       ORDER BY c.issued_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      tournamentId: row.tournament_id,
      userId: row.user_id,
      teamId: row.team_id,
      certificateUrl: row.certificate_url,
      verificationCode: row.verification_code,
      issuedAt: row.issued_at,
    }));
  }

  /**
   * Get a specific certificate
   */
  async getCertificate(certificateId: string): Promise<Certificate | null> {
    const result = await pool.query(
      `SELECT 
        id,
        tournament_id,
        user_id,
        team_id,
        certificate_url,
        verification_code,
        issued_at
       FROM certificates
       WHERE id = $1`,
      [certificateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tournamentId: row.tournament_id,
      userId: row.user_id,
      teamId: row.team_id,
      certificateUrl: row.certificate_url,
      verificationCode: row.verification_code,
      issuedAt: row.issued_at,
    };
  }

  /**
   * Verify a certificate by verification code
   */
  async verifyCertificate(verificationCode: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.verification_code,
        c.issued_at,
        t.name as tournament_name,
        t.sport,
        t.start_date,
        t.end_date,
        up.name as participant_name,
        teams.name as team_name
       FROM certificates c
       JOIN tournaments t ON c.tournament_id = t.id
       JOIN user_profiles up ON c.user_id = up.user_id
       JOIN teams ON c.team_id = teams.id
       WHERE c.verification_code = $1`,
      [verificationCode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      certificateId: row.id,
      verificationCode: row.verification_code,
      issuedAt: row.issued_at,
      tournament: {
        name: row.tournament_name,
        sport: row.sport,
        startDate: row.start_date,
        endDate: row.end_date,
      },
      participant: {
        name: row.participant_name,
        team: row.team_name,
      },
      verified: true,
    };
  }
}

export const certificateService = new CertificateService();
