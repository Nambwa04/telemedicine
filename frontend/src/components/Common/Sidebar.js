import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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

    // Persist & body class toggle
    useEffect(() => {
        try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch { }
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        return () => { document.body.classList.remove('sidebar-collapsed'); };
    }, [collapsed]);

    if (!user) return null;

    const role = user.role;

    const baseItems = [
        { to: `/${role}-dashboard`, icon: 'tachometer-alt', label: 'Dashboard' }
    ];

    const roleItemsMap = {
        patient: [
            { to: '/medications', icon: 'pills', label: 'Medications' },
            { to: '/caregivers', icon: 'user-nurse', label: 'Caregivers' },
            { to: '/health-dashboard', icon: 'chart-line', label: 'Health' }
        ],
        doctor: [
            { to: '/patients', icon: 'users', label: 'Patients' },
            { to: '/appointments', icon: 'calendar-day', label: 'Appointments' },
            { to: '/video-calls', icon: 'video', label: 'Video Calls' },
            { to: '/health-dashboard', icon: 'chart-line', label: 'Health' }
        ],
        caregiver: [
            { to: '/clients', icon: 'users', label: 'Clients' },
            { to: '/requests', icon: 'clipboard-list', label: 'Requests' },
            { to: '/schedule', icon: 'calendar-alt', label: 'Schedule' },
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
    return (
        <aside className={"app-sidebar" + (collapsed ? ' collapsed' : '') + mobileClass} aria-label="Primary">
            <div className="sidebar-header">
                <div className="brand" onClick={() => navigate(`/${role}-dashboard`)} role="button" tabIndex={0}>
                    <FontAwesomeIcon icon="heartbeat" className="me-2" />
                    <span>TeleMed+</span>
                </div>
                <button type="button" className="collapse-btn" onClick={toggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>
                    <FontAwesomeIcon icon={collapsed ? 'angle-right' : 'angle-left'} />
                </button>
                {mobileOpen && (
                    <button type="button" className="collapse-btn" style={{ right: '-48px' }} onClick={onMobileClose} aria-label="Close menu">
                        <FontAwesomeIcon icon="times" />
                    </button>
                )}
            </div>
            <nav className="sidebar-nav">
                {items.map(it => (
                    <NavLink key={it.to} to={it.to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} end>
                        <FontAwesomeIcon icon={it.icon} className="me-2" />
                        <span className="nav-label">{it.label}</span>
                    </NavLink>
                ))}
                <div className="sidebar-section-title mt-3">Account</div>
                <NavLink to="/profile" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                    <FontAwesomeIcon icon="user-circle" className="me-2" />
                    <span className="nav-label">Profile</span>
                </NavLink>
                <button type="button" className="nav-item btn-reset" onClick={toggle} aria-label="Toggle dark mode">
                    <FontAwesomeIcon icon={dark ? 'sun' : 'moon'} className="me-2" />
                    <span className="nav-label">{dark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button type="button" className="nav-item btn-reset text-danger" onClick={handleLogout} aria-label="Logout">
                    <FontAwesomeIcon icon="sign-out-alt" className="me-2" />
                    <span className="nav-label">Logout</span>
                </button>
            </nav>
            <div className="sidebar-footer small text-muted px-3 py-2">
                <span className="nav-label">Signed in as<br /><strong>{user.name}</strong></span>
            </div>
        </aside>
    );
};

export default Sidebar;
