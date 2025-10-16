import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, OverlayTrigger, Tooltip, Form, InputGroup, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const VideoConsultation = ({ appointmentId, userRole = 'patient' }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    // UI phase/state
    const [isCallActive, setIsCallActive] = useState(false);
    const [callStatus, setCallStatus] = useState('waiting'); // 'waiting', 'connected', 'ended'
    const [callDuration, setCallDuration] = useState(0);
    const [isLeaving, setIsLeaving] = useState(false);
    const callTimerRef = useRef(null);

    // Zego container
    const zegoContainerRef = useRef(null);
    const zegoResizeObserverRef = useRef(null);
    const zegoInstanceRef = useRef(null);
    const joinRafRef = useRef(0);
    const leavingRef = useRef(false);
    const mountedRef = useRef(true);
    // Sidebar overlap handling
    const pageContainerRef = useRef(null);
    const sidebarResizeObserverRef = useRef(null);
    const sidebarElRef = useRef(null);
    const [sidebarPadding, setSidebarPadding] = useState(0);

    // Welcome form state
    const defaultRoomId = `telemed-${appointmentId || 'demo'}`;
    const [roomId, setRoomId] = useState(defaultRoomId);
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState(userRole || 'patient');
    const [welcomeError, setWelcomeError] = useState(null);

    // Dark mode
    const [darkMode, setDarkMode] = useState(false);
    useEffect(() => {
        // Load preference or system setting
        const stored = localStorage.getItem('telemed.video.dark');
        if (stored === 'true' || stored === 'false') {
            setDarkMode(stored === 'true');
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDarkMode(true);
        }
    }, []);
    const toggleDarkMode = () => {
        setDarkMode((v) => {
            const next = !v;
            localStorage.setItem('telemed.video.dark', String(next));
            return next;
        });
    };
    // Pre-fill from URL if present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qRoom = params.get('roomId');
        const qName = params.get('name');
        if (qRoom) setRoomId(qRoom);
        if (qName) setDisplayName(qName);
    }, []);

    useEffect(() => {
        if (isCallActive && callStatus === 'connected') {
            callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
        } else if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
        }
        return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
    }, [isCallActive, callStatus]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startZegoCall = async () => {
        setWelcomeError(null);
        if (!roomId) {
            setWelcomeError('Please enter a Room ID.');
            return;
        }

        const effectiveName = displayName && displayName.trim() ? displayName.trim() : 'Guest';

        try {
            // Prefer using a pre-issued Kit Token if provided in env (safer for production)
            let kitToken = (process.env.REACT_APP_ZEGO_KIT_TOKEN || '').trim();
            if (!kitToken) {
                const rawAppId = (process.env.REACT_APP_ZEGO_APP_ID || '').trim();
                const appID = Number(rawAppId);
                const serverSecret = (process.env.REACT_APP_ZEGO_SERVER_SECRET || '').trim();
                if (!rawAppId || Number.isNaN(appID) || appID <= 0 || !serverSecret || serverSecret.length < 8) {
                    setWelcomeError('Zego config invalid. Provide REACT_APP_ZEGO_KIT_TOKEN (recommended) or a valid REACT_APP_ZEGO_APP_ID and REACT_APP_ZEGO_SERVER_SECRET.');
                    return;
                }
                // For testing only. Do NOT expose serverSecret in production.
                kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                    appID,
                    serverSecret,
                    roomId,
                    Date.now().toString(),
                    effectiveName
                );
            }

            setIsCallActive(true);
            setCallStatus('connecting');

            // Update URL with chosen params for shareability
            const newUrl = `${window.location.pathname}?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(effectiveName)}`;
            window.history.replaceState(null, '', newUrl);

            // Reset leave flag on a new attempt
            leavingRef.current = false;
            setIsLeaving(false);
            // Defer join until the container is in the DOM and connected
            let attempts = 0;
            const maxAttempts = 60; // ~1s at 60fps
            const joinWhenReady = () => {
                if (leavingRef.current || !mountedRef.current) return; // abort if already leaving/unmounted
                const containerEl = zegoContainerRef.current;
                if (!containerEl || !containerEl.isConnected) {
                    attempts += 1;
                    if (attempts > maxAttempts) {
                        setWelcomeError('Video area failed to initialize. Please try again.');
                        setIsCallActive(false);
                        setCallStatus('waiting');
                        return;
                    }
                    joinRafRef.current = requestAnimationFrame(joinWhenReady);
                    return;
                }
                // Final check before SDK creation: if we started leaving during the defer loop, abort
                if (leavingRef.current || !mountedRef.current) return;
                try {
                    // Avoid duplicate instances
                    try { zegoInstanceRef.current?.destroy?.(); } catch (_) { }
                    // Triple-check we're not leaving before creating SDK instance
                    if (leavingRef.current) return;
                    const zp = ZegoUIKitPrebuilt.create(kitToken);
                    if (!zp) throw new Error('Failed to initialize video SDK');
                    // Final check after creation
                    if (leavingRef.current) {
                        try { zp.destroy?.(); } catch (_) { }
                        return;
                    }
                    zegoInstanceRef.current = zp;
                    setCallStatus('connected');
                    zp.joinRoom({
                        container: containerEl,
                        sharedLinks: [
                            {
                                name: 'Copy link',
                                url: `${window.location.origin}${window.location.pathname}?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(effectiveName)}`
                            }
                        ],
                        scenario: {
                            mode: ZegoUIKitPrebuilt.OneONoneCall
                        },
                        showPreJoinView: false,
                        showScreenSharingButton: true,
                        onLeaveRoom: () => {
                            handleLeaveCall();
                        }
                    });
                } catch (e) {
                    console.error('Video join failed:', e);
                    setWelcomeError('Failed to start the call. Please refresh and try again.');
                    setIsCallActive(false);
                    setCallStatus('waiting');
                }
            };
            joinRafRef.current = requestAnimationFrame(joinWhenReady);
        } catch (err) {
            console.error('Failed to start Zego call:', err);
            setWelcomeError('Failed to start the call. Please check your configuration.');
        }
    };

    const handleLeaveCall = () => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        setIsLeaving(true);
        const endDuration = callDuration;

        // Cancel any pending join attempts
        if (joinRafRef.current) {
            try { cancelAnimationFrame(joinRafRef.current); } catch (_) { }
            joinRafRef.current = 0;
        }

        // Hide the container immediately to prevent visual artifacts
        if (zegoContainerRef.current) {
            zegoContainerRef.current.style.display = 'none';
        }

        // Immediately null out ref before destroying to prevent SDK from using it
        const instance = zegoInstanceRef.current;
        zegoInstanceRef.current = null;

        // Navigate immediately to force unmount and prevent SDK async operations
        const params = new URLSearchParams();
        if (roomId) params.set('roomId', roomId);
        if (displayName) params.set('name', displayName);
        params.set('ended', '1');
        params.set('ts', String(Date.now()));
        const suffix = `?${params.toString()}`;

        // Navigate first, then destroy in background
        navigate(`/video-call${suffix}`, { replace: true, state: { from: location.pathname, ended: true, duration: endDuration } });

        // Destroy after navigation initiated
        setTimeout(() => {
            try { instance?.destroy?.(); } catch (e) {
                console.warn('SDK cleanup after navigation:', e);
            }
        }, 0);

        setIsCallActive(false);
        setCallStatus('ended');
        setCallDuration(0);
    };

    // Ensure Zego UI reflows when the layout width changes (e.g., sidebar toggle)
    useEffect(() => {
        if (!isCallActive || !zegoContainerRef.current) return;
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                // Zego UI often listens on window resize events to recompute layout
                window.dispatchEvent(new Event('resize'));
            });
            ro.observe(zegoContainerRef.current);
            zegoResizeObserverRef.current = ro;
            return () => {
                try { ro.disconnect(); } catch (_) { }
                zegoResizeObserverRef.current = null;
            };
        }
    }, [isCallActive]);

    // Detect overlaying sidebar and pad content to avoid overlap while in a call
    useEffect(() => {
        const selectors = ['#sidebar', '.sidebar', '.app-sidebar', '[data-sidebar]'];
        const getSidebarEl = () => {
            if (sidebarElRef.current && document.body.contains(sidebarElRef.current)) return sidebarElRef.current;
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) return el;
            }
            return null;
        };

        const measure = () => {
            if (!isCallActive) { setSidebarPadding(0); return; }
            const el = getSidebarEl();
            sidebarElRef.current = el;
            if (!el) { setSidebarPadding(0); return; }
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            const isOverlaying = (style.position === 'fixed' || style.position === 'sticky' || style.position === 'absolute') && rect.left <= 8;
            if (isVisible && isOverlaying) {
                // Check if main already offsets for sidebar (desktop layout)
                const main = document.querySelector('main.with-sidebar');
                let existingOffset = 0;
                if (main) {
                    const mainStyle = window.getComputedStyle(main);
                    const ml = parseFloat(mainStyle.marginLeft || '0');
                    if (!Number.isNaN(ml)) existingOffset = ml;
                }
                const needed = Math.max(Math.round(rect.width - existingOffset), 0);
                setSidebarPadding(needed);
            } else {
                setSidebarPadding(0);
            }
        };

        measure();
        window.addEventListener('resize', measure);
        // Observe sidebar width changes if present
        const el = getSidebarEl();
        if (el && typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(measure);
            ro.observe(el);
            sidebarResizeObserverRef.current = ro;
        }
        // Watch mutations that might toggle the sidebar
        const mo = new MutationObserver(measure);
        mo.observe(document.body, { attributes: true, childList: true, subtree: true });

        return () => {
            window.removeEventListener('resize', measure);
            try { sidebarResizeObserverRef.current?.disconnect(); } catch (_) { }
            sidebarResizeObserverRef.current = null;
            try { mo.disconnect(); } catch (_) { }
        };
    }, [isCallActive]);

    // Cleanup Zego instance on unmount just in case
    useEffect(() => {
        mountedRef.current = true;

        // Global error handler to catch SDK errors after leave
        const errorHandler = (event) => {
            if (event.message?.includes('createSpan') || event.error?.message?.includes('createSpan')) {
                event.preventDefault();
                event.stopPropagation();
                console.warn('Suppressed SDK error after leave:', event.error || event.message);
                return true;
            }
        };
        window.addEventListener('error', errorHandler, true);

        return () => {
            mountedRef.current = false;
            window.removeEventListener('error', errorHandler, true);
            if (joinRafRef.current) {
                try { cancelAnimationFrame(joinRafRef.current); } catch (_) { }
                joinRafRef.current = 0;
            }
            try { zegoInstanceRef.current?.destroy?.(); } catch (_) { }
            zegoInstanceRef.current = null;
        };
    }, []);

    return (
        <Container
            fluid
            ref={pageContainerRef}
            className={`video-consultation-container ${darkMode ? 'dark' : ''} p-0`}
        >

            {/* Welcome / Pre-Join */}
            {!isCallActive && (
                <Row className="mb-4">
                    <Col lg={12} className="mb-4">
                        <div className="welcome-hero p-4 p-md-5 rounded shadow-sm">
                            <h2 className="mb-3">
                                <FontAwesomeIcon icon="handshake" className="me-2" />
                                Welcome to your secure video consultation
                            </h2>
                            {callStatus === 'ended' && (
                                <Alert variant="success" className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <FontAwesomeIcon icon="check-circle" className="me-2" />
                                        Consultation completed successfully.
                                        {typeof location?.state?.duration === 'number' && (
                                            <>
                                                {' '}Duration: {formatDuration(location.state.duration)}
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            const routeRole = user?.role || role; // prefer auth role, fallback to selected role
                                            const map = { patient: '/patient-dashboard', doctor: '/doctor-dashboard', caregiver: '/caregiver-dashboard', admin: '/admin-dashboard' };
                                            navigate(map[routeRole] || '/');
                                        }}
                                    >
                                        <FontAwesomeIcon icon="home" className="me-2" /> Return to dashboard
                                    </Button>
                                </Alert>
                            )}
                            {welcomeError && (
                                <Alert variant="danger" className="mb-3">{welcomeError}</Alert>
                            )}
                            <p className="text-muted">Enter your name and confirm the room to join the call. You can share the link with the other participant.</p>
                            <Form>
                                <Row>
                                    <Col md={6} className="mb-3">
                                        <Form.Label>Display name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="e.g., Dr. Nambwa or Nambwa Beryl"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                        />
                                    </Col>
                                    <Col md={6} className="mb-3">
                                        <Form.Label>Role</Form.Label>
                                        <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
                                            <option value="doctor">Doctor</option>
                                            <option value="patient">Patient</option>
                                        </Form.Select>
                                    </Col>
                                </Row>
                                <Form.Label>Room ID</Form.Label>
                                <InputGroup className="mb-3">
                                    <Form.Control
                                        type="text"
                                        value={roomId}
                                        onChange={(e) => setRoomId(e.target.value)}
                                    />
                                    <Button variant={darkMode ? 'outline-light' : 'outline-secondary'} onClick={() => navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?roomId=${encodeURIComponent(roomId)}`)}>
                                        <FontAwesomeIcon icon="link" className="me-1" /> Copy link
                                    </Button>
                                </InputGroup>

                                <div className="d-flex gap-2">
                                    <Button variant="success" onClick={startZegoCall}>
                                        <FontAwesomeIcon icon="video" className="me-2" /> Start/Join Call
                                    </Button>
                                    <OverlayTrigger placement="top" overlay={<Tooltip>Requires ZegoCloud setup</Tooltip>}>
                                        <Button variant={darkMode ? 'outline-light' : 'outline-primary'} onClick={() => window.open('https://www.zegocloud.com/', '_blank')}>
                                            <FontAwesomeIcon icon="circle-info" className="me-2" /> Learn more
                                        </Button>
                                    </OverlayTrigger>
                                </div>
                            </Form>
                        </div>
                    </Col>
                </Row>
            )}

            <Row>
                {/* Video Area / Zego Container */}
                {isCallActive && !isLeaving && (
                    <Col lg={12} className="mb-0">
                        <Card className="medical-card video-card" style={{ height: '100vh', borderRadius: 0, overflow: 'visible' }}>
                            <Card.Body className="p-0 position-relative" style={{ height: '100%' }}>
                                {callStatus === 'connecting' && (
                                    <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ zIndex: 5 }}>
                                        <Spinner animation="border" role="status" variant="light" />
                                        <div className="mt-2 text-light">Connecting…</div>
                                    </div>
                                )}
                                {callStatus === 'connected' && (
                                    <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 1000 }}>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={handleLeaveCall}
                                            title="Leave Call"
                                        >
                                            <FontAwesomeIcon icon="phone-slash" className="me-2" />
                                            Leave Call
                                        </Button>
                                    </div>
                                )}
                                <div ref={zegoContainerRef} className="w-100 h-100" />
                            </Card.Body>
                        </Card>
                    </Col>
                )}

            </Row>

            {/* Ended notice is now shown atop the welcome hero with a Return to dashboard button */}

            <style jsx>{`
        .video-consultation-container {
          min-height: 100vh;
          background-color: #f8f9fa;
        }
        
        .video-card {
          background: #000;
          border-radius: 12px;
          overflow: hidden;
        }
          .welcome-hero {
              background: #fff;
          }
          /* Dark mode (scoped to this page) */
          .video-consultation-container.dark {
              background-color: #0d1117;
              color: #e6edf3;
          }
          .video-consultation-container.dark .welcome-hero {
              background: #161b22;
              color: #e6edf3;
          }
          .video-consultation-container.dark .text-muted {
              color: #8b949e !important;
          }
          .video-consultation-container.dark .card.medical-card {
              background: #161b22;
              border-color: #30363d;
              color: #e6edf3;
          }
          .video-consultation-container.dark .card .card-header,
          .video-consultation-container.dark .card-header {
              background: #0d1117;
              border-bottom-color: #30363d;
              color: #e6edf3;
          }
          .video-consultation-container.dark .form-control,
          .video-consultation-container.dark .form-select,
          .video-consultation-container.dark .input-group-text {
              background-color: #0d1117;
              color: #e6edf3;
              border-color: #30363d;
          }
          .video-consultation-container.dark .btn-outline-secondary,
          .video-consultation-container.dark .btn-outline-primary,
          .video-consultation-container.dark .btn-outline-light {
              border-color: #8b949e;
              color: #e6edf3;
          }
          .video-consultation-container.dark .btn-outline-light:hover {
              background-color: #21262d;
          }
          .video-consultation-container.dark .badge.bg-success {
              background-color: #238636 !important;
          }
        
                /* Zego UI takes over the main video area */
      `}</style>
        </Container>
    );
};

export default VideoConsultation;