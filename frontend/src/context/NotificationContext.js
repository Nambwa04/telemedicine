/**
 * Notification Context Provider.
 * Manages global toast notifications.
 * Provides methods to push and remove notifications.
 */
import React, { createContext, useContext, useCallback, useState } from 'react';

const NotificationContext = createContext(null);

let idCounter = 0;

export const NotificationProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts(ts => ts.filter(t => t.id !== id));
    }, []);

    const push = useCallback((message, { type = 'info', autoClose = 5000 } = {}) => {
        const id = ++idCounter;
        setToasts(ts => [...ts, { id, message, type }]);
        if (autoClose) {
            setTimeout(() => remove(id), autoClose);
        }
        return id;
    }, [remove]);

    const api = { push, remove };

    return (
        <NotificationContext.Provider value={api}>
            {children}
            <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 2000 }}>
                {toasts.map(t => (
                    <div key={t.id} className={`toast show border-0 shadow-sm mb-2 bg-${mapType(t.type)} text-white`} role="alert" aria-live="assertive" aria-atomic="true">
                        <div className="d-flex">
                            <div className="toast-body">{t.message}</div>
                            <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={() => remove(t.id)}></button>
                        </div>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

function mapType(type) {
    switch (type) {
        case 'success': return 'success';
        case 'error': return 'danger';
        case 'warning': return 'warning';
        default: return 'primary';
    }
}

export function useNotifications() {
    return useContext(NotificationContext);
}
