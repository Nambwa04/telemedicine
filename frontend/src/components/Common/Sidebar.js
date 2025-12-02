/**
 * Sidebar Component.
 * Provides collapsible side navigation for authenticated users.
 * Adapts menu items based on user role and handles mobile responsiveness.
 */
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/* Sidebar shown on authenticated dashboard pages (patient/doctor/caregiver) */
const Sidebar = ({ mobileOpen = false, onMobileClose }) => {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebar-collapsed');
            return saved === 'true';
        } catch { return false; }
    });

    // Auto-collapse on small screens without overriding user preference
    const [autoCollapsed, setAutoCollapsed] = useState(false);
    useEffect(() => {
        const compute = () => setAutoCollapsed(window.innerWidth < 992); // match bootstrap lg breakpoint
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, []);

    // Persist & body class toggle
    useEffect(() => {
        try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch { }
        const effective = collapsed || autoCollapsed;
        document.body.classList.toggle('sidebar-collapsed', effective);
        document.body.classList.toggle('sidebar-auto-collapsed', autoCollapsed);
        return () => {
            document.body.classList.remove('sidebar-collapsed');
            document.body.classList.remove('sidebar-auto-collapsed');
        };
    }, [collapsed, autoCollapsed]);

    // Close mobile sidebar on route change automatically
    const location = useLocation();
    useEffect(() => {
        if (mobileOpen && typeof onMobileClose === 'function') {
            onMobileClose();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const isCollapsed = collapsed || autoCollapsed;

    if (!user) return null;

    const role = user.role;

    const baseItems = [
        { to: `/${role}-dashboard`, icon: 'tachometer-alt', label: 'Dashboard' }
    ];

    const roleItemsMap = {
        patient: [
            { to: '/appointments', icon: 'calendar-day', label: 'Appointments' },
            { to: '/video-call', icon: 'video', label: 'Video Call' },
            { to: '/medications', icon: 'pills', label: 'Medications' },
            { to: '/follow-ups', icon: 'bell', label: 'Follow-Ups' },
            { to: '/doctors', icon: 'user-md', label: 'Find a Doctor' },
            { to: '/caregivers', icon: 'user-nurse', label: 'Find a Caregiver' },
            { to: '/health-dashboard', icon: 'chart-line', label: 'Health' }
        ],
        doctor: [
            { to: '/patients', icon: 'users', label: 'Patients' },
            { to: '/appointments', icon: 'calendar-day', label: 'Appointments' },
            { to: '/assignment-requests', icon: 'user-plus', label: 'Assignment Requests' },
            { to: '/follow-ups', icon: 'bell', label: 'Follow-Ups' },
            { to: '/video-calls', icon: 'video', label: 'Video Calls' },
            { to: '/health-dashboard', icon: 'chart-line', label: 'Health' }
        ],
        caregiver: [
            { to: '/clients', icon: 'users', label: 'Clients' },
            { to: '/requests', icon: 'clipboard-list', label: 'Requests' },
            { to: '/caregiver/timesheet', icon: 'clock', label: 'Timesheet' },
            { to: '/health-dashboard', icon: 'chart-line', label: 'Health' }
        ]
    };

    let items = [...baseItems, ...(roleItemsMap[role] || [])];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleCollapse = () => setCollapsed(c => !c);



    const mobileClass = mobileOpen ? ' open' : '';
    // Build a robust display name and details for footer
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const displayName = fullName || (typeof user.name === 'string' && user.name.trim()) || user.email || user.username || 'User';
    const displayEmail = user.email || '';
    const displayRole = (user.role || '').charAt(0).toUpperCase() + (user.role || '').slice(1);

    return (
        <aside className={"app-sidebar" + (isCollapsed ? ' collapsed' : '') + (autoCollapsed ? ' auto-collapsed' : '') + mobileClass} aria-label="Primary">
            <div className="sidebar-header">
                <div className="brand" onClick={() => navigate(`/${role}-dashboard`)} role="button" tabIndex={0}>
                    <FontAwesomeIcon icon="heartbeat" className="me-2" />
                    <span aria-hidden={isCollapsed}>TeleMed+</span>
                </div>
                <button type="button" className="collapse-btn" onClick={toggleCollapse} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!isCollapsed}>
                    <FontAwesomeIcon icon={isCollapsed ? 'angle-right' : 'angle-left'} />
                </button>
                {mobileOpen && (
                    <button type="button" className="collapse-btn mobile-close" onClick={onMobileClose} aria-label="Close menu">
                        <FontAwesomeIcon icon="times" />
                    </button>
                )}
            </div>
            <nav className="sidebar-nav" role="navigation" aria-label="Sidebar">
                {items.map(it => (
                    <NavLink
                        key={it.to}
                        to={it.to}
                        className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                        end
                        onClick={() => { if (mobileOpen && typeof onMobileClose === 'function') onMobileClose(); }}
                        aria-label={it.label}
                        title={isCollapsed ? it.label : undefined}
                    >
                        <FontAwesomeIcon icon={it.icon} className="me-2" />
                        <span className="nav-label" aria-hidden={isCollapsed}>{it.label}</span>
                    </NavLink>
                ))}
                <div className="sidebar-section-title mt-3" title={isCollapsed ? 'Account' : undefined} aria-hidden={isCollapsed}>Account</div>
                <NavLink to="/profile" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={() => { if (mobileOpen && typeof onMobileClose === 'function') onMobileClose(); }} aria-label="Profile" title={isCollapsed ? 'Profile' : undefined}>
                    <FontAwesomeIcon icon="user-circle" className="me-2" />
                    <span className="nav-label" aria-hidden={isCollapsed}>Profile</span>
                </NavLink>
                <button type="button" className="nav-item btn-reset" onClick={toggle} aria-label="Toggle dark mode" title={isCollapsed ? (dark ? 'Light Mode' : 'Dark Mode') : undefined}>
                    <FontAwesomeIcon icon={dark ? 'sun' : 'moon'} className="me-2" />
                    <span className="nav-label" aria-hidden={isCollapsed}>{dark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button type="button" className="nav-item btn-reset text-danger" onClick={handleLogout} aria-label="Logout" title={isCollapsed ? 'Logout' : undefined}>
                    <FontAwesomeIcon icon="sign-out-alt" className="me-2" />
                    <span className="nav-label" aria-hidden={isCollapsed}>Logout</span>
                </button>
            </nav>
            <div className="sidebar-footer small text-muted px-3 py-2">
                <div className="d-flex align-items-start gap-2">
                    <span aria-hidden="true" className="mt-1"><FontAwesomeIcon icon="user-circle" /></span>
                    <div>
                        <div className="nav-label" aria-hidden={isCollapsed}>Signed in as</div>
                        <strong className="d-block" aria-hidden={isCollapsed} title={isCollapsed ? displayName : undefined}>{displayName}</strong>
                        {displayEmail && <span className="d-block" aria-label="Email" aria-hidden={isCollapsed} title={isCollapsed ? displayEmail : undefined}>{displayEmail}</span>}
                        {displayRole && <span className="d-block" aria-label="Role" aria-hidden={isCollapsed} title={isCollapsed ? `Role: ${displayRole}` : undefined}>Role: {displayRole}</span>}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
