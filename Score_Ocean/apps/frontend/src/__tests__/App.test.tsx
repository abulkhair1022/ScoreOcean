import { describe, it, expect } from 'vitest';

describe('Frontend Setup', () => {
  it('should have correct environment', () => {
    expect(import.meta.env).toBeDefined();
  });

  it('should be able to import React', () => {
    const React = require('react');
    expect(React).toBeDefined();
  });
});
