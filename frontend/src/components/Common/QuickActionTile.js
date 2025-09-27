import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/*
Reusable quick action tile component.
Props:
 - icon (font awesome icon string)
 - label (short uppercase label)
 - accent (gradient-* class or custom class)
 - onClick (handler)
 - asButton (boolean) if true renders button element for semantics; default div role=button
*/
const QuickActionTile = ({ icon, label, accent = 'gradient-primary', onClick, asButton = false, className = '', ...rest }) => {
    const baseClass = `quick-action-tile ${accent} ${className}`.trim();
    const commonProps = {
        className: baseClass,
        onClick,
        onKeyDown: (e) => {
            if (!onClick) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
            }
        },
        tabIndex: 0,
        role: 'button',
        'aria-label': label,
        ...rest
    };

    if (asButton) {
        return (
            <button type="button" {...commonProps} style={{ border: 'none', background: 'unset', padding: 0 }}>
                <FontAwesomeIcon icon={icon} className="icon" />
                <span className="label">{label}</span>
            </button>
        );
    }

    return (
        <div {...commonProps}>
            <FontAwesomeIcon icon={icon} className="icon" />
            <span className="label">{label}</span>
        </div>
    );
};

QuickActionTile.propTypes = {
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
    label: PropTypes.string.isRequired,
    accent: PropTypes.string,
    onClick: PropTypes.func,
    asButton: PropTypes.bool,
    className: PropTypes.string
};

export default QuickActionTile;
