describe('Project Setup', () => {
  it('should have correct environment configuration', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should be able to import shared types', () => {
    const { Sport, UserRole } = require('@score-ocean/types');
    expect(Sport.CRICKET).toBe('CRICKET');
    expect(UserRole.PLAYER).toBe('PLAYER');
  });
});
