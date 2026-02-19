import { certificateService } from '../certificate.service';
import pool from '../../db/postgres';

// Mock the database
jest.mock('../../db/postgres', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

describe('Certificate Service', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('generateCertificatesForTournament', () => {
    it('should generate certificates for all participants in a completed tournament', async () => {
      const tournamentId = 'tournament-1';

      // Mock BEGIN, tournament query, standings, participants, inserts, and COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              name: 'Summer Cricket League',
              sport: 'CRICKET',
              start_date: '2024-01-01',
              end_date: '2024-01-31',
            },
          ],
        })
        // Mock standings query
        .mockResolvedValueOnce({
          rows: [
            { team_id: 'team-1', team_name: 'Team A', points: 9, goal_difference: 5 },
            { team_id: 'team-2', team_name: 'Team B', points: 6, goal_difference: 2 },
          ],
        })
        // Mock participants query
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'user-1',
              email: 'player1@example.com',
              participant_name: 'Player One',
              team_id: 'team-1',
              team_name: 'Team A',
            },
            {
              user_id: 'user-2',
              email: 'player2@example.com',
              participant_name: 'Player Two',
              team_id: 'team-2',
              team_name: 'Team B',
            },
          ],
        })
        // Mock certificate insert queries
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'cert-1',
              tournament_id: tournamentId,
              user_id: 'user-1',
              team_id: 'team-1',
              certificate_url: 'data:application/pdf;base64,mock',
              verification_code: 'VERIFY1',
              issued_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'cert-2',
              tournament_id: tournamentId,
              user_id: 'user-2',
              team_id: 'team-2',
              certificate_url: 'data:application/pdf;base64,mock',
              verification_code: 'VERIFY2',
              issued_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const certificates = await certificateService.generateCertificatesForTournament(
        tournamentId
      );

      expect(certificates).toHaveLength(2);
      expect(certificates[0].userId).toBe('user-1');
      expect(certificates[1].userId).toBe('user-2');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if tournament is not completed', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        certificateService.generateCertificatesForTournament('tournament-1')
      ).rejects.toThrow('Tournament not found or not completed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              name: 'Summer Cricket League',
              sport: 'CRICKET',
              start_date: '2024-01-01',
              end_date: '2024-01-31',
            },
          ],
        })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        certificateService.generateCertificatesForTournament('tournament-1')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getUserCertificates', () => {
    it('should return all certificates for a user', async () => {
      const userId = 'user-1';
      const mockCertificates = [
        {
          id: 'cert-1',
          tournament_id: 'tournament-1',
          user_id: userId,
          team_id: 'team-1',
          certificate_url: 'data:application/pdf;base64,mock',
          verification_code: 'VERIFY1',
          issued_at: new Date(),
          tournament_name: 'Summer League',
          sport: 'CRICKET',
          team_name: 'Team A',
        },
      ];

      (pool.query as jest.Mock).mockResolvedValue({
        rows: mockCertificates,
      });

      const certificates = await certificateService.getUserCertificates(userId);

      expect(certificates).toHaveLength(1);
      expect(certificates[0].userId).toBe(userId);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
    });

    it('should return empty array if user has no certificates', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const certificates = await certificateService.getUserCertificates('user-1');

      expect(certificates).toHaveLength(0);
    });
  });

  describe('getCertificate', () => {
    it('should return a specific certificate', async () => {
      const certificateId = 'cert-1';
      const mockCertificate = {
        id: certificateId,
        tournament_id: 'tournament-1',
        user_id: 'user-1',
        team_id: 'team-1',
        certificate_url: 'data:application/pdf;base64,mock',
        verification_code: 'VERIFY1',
        issued_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockCertificate],
      });

      const certificate = await certificateService.getCertificate(certificateId);

      expect(certificate).not.toBeNull();
      expect(certificate?.id).toBe(certificateId);
    });

    it('should return null if certificate not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const certificate = await certificateService.getCertificate('invalid-id');

      expect(certificate).toBeNull();
    });
  });

  describe('verifyCertificate', () => {
    it('should verify a certificate with valid verification code', async () => {
      const verificationCode = 'VERIFY123';
      const mockData = {
        id: 'cert-1',
        verification_code: verificationCode,
        issued_at: new Date(),
        tournament_name: 'Summer League',
        sport: 'CRICKET',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        participant_name: 'Player One',
        team_name: 'Team A',
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockData],
      });

      const result = await certificateService.verifyCertificate(verificationCode);

      expect(result).not.toBeNull();
      expect(result?.verified).toBe(true);
      expect(result?.verificationCode).toBe(verificationCode);
      expect(result?.tournament.name).toBe('Summer League');
      expect(result?.participant.name).toBe('Player One');
    });

    it('should return null for invalid verification code', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await certificateService.verifyCertificate('INVALID');

      expect(result).toBeNull();
    });
  });
});
