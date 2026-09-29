import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Navigation } from '../src/components/Navigation';
import { ActionGroup, StatusMessage, Surface } from '../src/components/ui';

describe('shared design system', () => {
  it('exposes labelled navigation with the current route', () => {
    render(
      <MemoryRouter initialEntries={['/rooms']}>
        <Navigation />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rooms' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps surfaces, actions, and semantic status messages discoverable', () => {
    render(
      <Surface labelledBy="panel-title">
        <h2 id="panel-title">Table state</h2>
        <StatusMessage tone="success">Action accepted.</StatusMessage>
        <ActionGroup><button type="button">Continue</button></ActionGroup>
      </Surface>
    );

    expect(screen.getByRole('region', { name: 'Table state' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Action accepted.');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});