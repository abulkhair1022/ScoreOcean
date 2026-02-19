import { Router, Response } from 'express';
import { certificateService } from '../services/certificate.service';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Generate certificates for a tournament
 * POST /api/certificates/generate/:tournamentId
 */
router.post(
  '/generate/:tournamentId',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { tournamentId } = req.params;

      // Generate certificates for all participants
      const certificates = await certificateService.generateCertificatesForTournament(
        tournamentId
      );

      res.status(201).json({
        message: 'Certificates generated successfully',
        count: certificates.length,
        certificates: certificates.map((cert) => ({
          id: cert.id,
          userId: cert.userId,
          verificationCode: cert.verificationCode,
        })),
      });
    } catch (error: any) {
      console.error('Error generating certificates:', error);
      res.status(500).json({
        error: {
          code: 'CERTIFICATE_GENERATION_FAILED',
          message: error.message || 'Failed to generate certificates',
        },
      });
    }
  }
);

/**
 * Get user's certificates
 * GET /api/certificates/user/:userId
 */
router.get(
  '/user/:userId',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Verify user can only access their own certificates (unless admin)
      if (req.user?.userId !== userId && req.user?.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own certificates',
          },
        });
        return;
      }

      const certificates = await certificateService.getUserCertificates(userId);

      res.json({
        certificates,
      });
    } catch (error: any) {
      console.error('Error fetching certificates:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: error.message || 'Failed to fetch certificates',
        },
      });
    }
  }
);

/**
 * Get a specific certificate
 * GET /api/certificates/:certificateId
 */
router.get('/:certificateId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { certificateId } = req.params;

    const certificate = await certificateService.getCertificate(certificateId);

    if (!certificate) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Certificate not found',
        },
      });
      return;
    }

    res.json({
      certificate,
    });
  } catch (error: any) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_FAILED',
        message: error.message || 'Failed to fetch certificate',
      },
    });
  }
});

/**
 * Verify a certificate by verification code
 * GET /api/certificates/verify/:verificationCode
 */
router.get('/verify/:verificationCode', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { verificationCode } = req.params;

    const certificateData = await certificateService.verifyCertificate(
      verificationCode
    );

    if (!certificateData) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Certificate not found or invalid verification code',
        },
      });
      return;
    }

    res.json(certificateData);
  } catch (error: any) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({
      error: {
        code: 'VERIFICATION_FAILED',
        message: error.message || 'Failed to verify certificate',
      },
    });
  }
});

export default router;
