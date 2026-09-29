import { NavLink } from 'react-router-dom';

const navigationItems = [
  { to: '/rooms', label: 'Rooms' },
  { to: '/local-game', label: 'Local game' },
  { to: '/trainer', label: 'Trainer' },
  { to: '/hand-history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/friends', label: 'Friends' },
  { to: '/profile', label: 'Profile' }
];

export function Navigation() {
  return (
    <nav className="app-shell__nav" aria-label="Primary navigation">
      <div className="app-shell__nav-inner">
        <NavLink className="app-shell__brand" to="/rooms">Poker Play</NavLink>
        <div className="app-shell__links">
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/rooms'}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
