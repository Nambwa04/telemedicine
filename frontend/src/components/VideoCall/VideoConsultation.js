import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const VideoConsultation = ({ appointmentId, userRole = 'patient' }) => {
    const [isCallActive, setIsCallActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callStatus, setCallStatus] = useState('waiting'); // 'waiting', 'connecting', 'connected', 'ended'
    const [callDuration, setCallDuration] = useState(0);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const callTimerRef = useRef(null);

    // Mock appointment data
    const [appointmentData] = useState({
        id: appointmentId || 1,
        patient: { name: 'John Doe', age: 45, id: 'P001' },
        doctor: { name: 'Dr. Sarah Johnson', specialization: 'Cardiology', id: 'D001' },
        scheduledTime: '2:00 PM',
        date: new Date().toLocaleDateString(),
        type: 'Follow-up Consultation'
    });

    const [chatMessages, setChatMessages] = useState([
        { id: 1, sender: 'Dr. Sarah Johnson', message: 'Hello! I\'ll be with you shortly.', timestamp: '2:00 PM', type: 'system' }
    ]);

    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        if (isCallActive && callStatus === 'connected') {
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
        }

        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
        };
    }, [isCallActive, callStatus]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartCall = async () => {
        setCallStatus('connecting');
        setIsCallActive(true);

        // Simulate connection process
        setTimeout(() => {
            setCallStatus('connected');
        }, 2000);

        // Mock camera access
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.log('Camera access denied or not available');
        }
    };

    const handleEndCall = () => {
        setIsCallActive(false);
        setCallStatus('ended');
        setCallDuration(0);

        // Stop media streams
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            const tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const toggleVideo = () => {
        setIsVideoOff(!isVideoOff);
    };

    const toggleScreenShare = () => {
        setIsScreenSharing(!isScreenSharing);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const message = {
                id: chatMessages.length + 1,
                sender: userRole === 'doctor' ? appointmentData.doctor.name : appointmentData.patient.name,
                message: newMessage,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'user'
            };
            setChatMessages([...chatMessages, message]);
            setNewMessage('');
        }
    };

    return (
        <Container fluid className="video-consultation-container">
            <Row className="mb-3">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 className="mb-1">
                                <FontAwesomeIcon icon="video" className="text-primary me-2" />
                                Video Consultation
                            </h4>
                            <p className="text-muted mb-0">
                                {appointmentData.type} - {appointmentData.date} at {appointmentData.scheduledTime}
                            </p>
                        </div>
                        {isCallActive && (
                            <div className="d-flex align-items-center">
                                <Badge bg="success" className="me-2">
                                    <FontAwesomeIcon icon="circle" className="me-1" />
                                    {callStatus === 'connected' ? 'Live' : 'Connecting...'}
                                </Badge>
                                {callStatus === 'connected' && (
                                    <span className="text-muted">{formatDuration(callDuration)}</span>
                                )}
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {!isCallActive && callStatus !== 'ended' && (
                <Row className="mb-4">
                    <Col>
                        <Alert variant="info" className="text-center">
                            <FontAwesomeIcon icon="info-circle" className="me-2" />
                            {userRole === 'doctor'
                                ? `Ready to start consultation with ${appointmentData.patient.name}`
                                : `Waiting for ${appointmentData.doctor.name} to join the call`}
                        </Alert>
                    </Col>
                </Row>
            )}

            <Row>
                {/* Video Area */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card video-card" style={{ height: '500px' }}>
                        <Card.Body className="p-0 position-relative">
                            {!isCallActive ? (
                                // Pre-call screen
                                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
                                    <FontAwesomeIcon icon="video-slash" size="3x" className="text-muted mb-3" />
                                    <h5 className="text-muted mb-3">Video call not started</h5>
                                    <div className="mb-4">
                                        <h6>Appointment Details:</h6>
                                        <p className="mb-1"><strong>Patient:</strong> {appointmentData.patient.name}</p>
                                        <p className="mb-1"><strong>Doctor:</strong> {appointmentData.doctor.name}</p>
                                        <p className="mb-1"><strong>Specialization:</strong> {appointmentData.doctor.specialization}</p>
                                    </div>
                                    <Button
                                        variant="success"
                                        size="lg"
                                        onClick={handleStartCall}
                                        className="px-4"
                                    >
                                        <FontAwesomeIcon icon="video" className="me-2" />
                                        {userRole === 'doctor' ? 'Start Consultation' : 'Join Call'}
                                    </Button>
                                </div>
                            ) : (
                                // Active call screen
                                <div className="video-container h-100">
                                    {callStatus === 'connecting' ? (
                                        <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                            <div className="spinner-border text-primary mb-3" role="status">
                                                <span className="visually-hidden">Connecting...</span>
                                            </div>
                                            <h5>Connecting to call...</h5>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Remote Video (Main) */}
                                            <div className="remote-video position-relative w-100 h-100">
                                                {isVideoOff ? (
                                                    <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-dark text-white">
                                                        <FontAwesomeIcon icon="user-circle" size="4x" className="mb-2" />
                                                        <h5>{userRole === 'patient' ? appointmentData.doctor.name : appointmentData.patient.name}</h5>
                                                    </div>
                                                ) : (
                                                    <video
                                                        ref={remoteVideoRef}
                                                        autoPlay
                                                        className="w-100 h-100"
                                                        style={{ objectFit: 'cover' }}
                                                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23dee2e6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236c757d'%3ERemote Video%3C/text%3E%3C/svg%3E"
                                                    />
                                                )}

                                                {/* Local Video (Picture-in-Picture) */}
                                                <div className="local-video position-absolute" style={{ top: '20px', right: '20px', width: '200px', height: '150px' }}>
                                                    <video
                                                        ref={localVideoRef}
                                                        autoPlay
                                                        muted
                                                        className="w-100 h-100 rounded border border-white"
                                                        style={{ objectFit: 'cover' }}
                                                    />
                                                    <div className="position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-50 text-white text-center py-1">
                                                        <small>You</small>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Video Controls */}
                                            <div className="video-controls position-absolute bottom-0 start-0 end-0 p-3">
                                                <div className="d-flex justify-content-center gap-3">
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{isMuted ? 'Unmute' : 'Mute'}</Tooltip>}>
                                                        <Button
                                                            variant={isMuted ? 'danger' : 'secondary'}
                                                            className="rounded-circle"
                                                            style={{ width: '50px', height: '50px' }}
                                                            onClick={toggleMute}
                                                        >
                                                            <FontAwesomeIcon icon={isMuted ? 'microphone-slash' : 'microphone'} />
                                                        </Button>
                                                    </OverlayTrigger>

                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{isVideoOff ? 'Turn on camera' : 'Turn off camera'}</Tooltip>}>
                                                        <Button
                                                            variant={isVideoOff ? 'danger' : 'secondary'}
                                                            className="rounded-circle"
                                                            style={{ width: '50px', height: '50px' }}
                                                            onClick={toggleVideo}
                                                        >
                                                            <FontAwesomeIcon icon={isVideoOff ? 'video-slash' : 'video'} />
                                                        </Button>
                                                    </OverlayTrigger>

                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Share screen</Tooltip>}>
                                                        <Button
                                                            variant={isScreenSharing ? 'primary' : 'secondary'}
                                                            className="rounded-circle"
                                                            style={{ width: '50px', height: '50px' }}
                                                            onClick={toggleScreenShare}
                                                        >
                                                            <FontAwesomeIcon icon="desktop" />
                                                        </Button>
                                                    </OverlayTrigger>

                                                    <OverlayTrigger placement="top" overlay={<Tooltip>End call</Tooltip>}>
                                                        <Button
                                                            variant="danger"
                                                            className="rounded-circle"
                                                            style={{ width: '50px', height: '50px' }}
                                                            onClick={handleEndCall}
                                                        >
                                                            <FontAwesomeIcon icon="phone-slash" />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Chat and Info Sidebar */}
                <Col lg={4}>
                    {/* Patient/Doctor Info */}
                    <Card className="medical-card mb-3">
                        <Card.Header>
                            <FontAwesomeIcon icon="user-md" className="me-2" />
                            {userRole === 'doctor' ? 'Patient Information' : 'Doctor Information'}
                        </Card.Header>
                        <Card.Body>
                            {userRole === 'doctor' ? (
                                <div>
                                    <h6>{appointmentData.patient.name}</h6>
                                    <p className="mb-1"><strong>Age:</strong> {appointmentData.patient.age}</p>
                                    <p className="mb-1"><strong>Patient ID:</strong> {appointmentData.patient.id}</p>
                                    <p className="mb-0"><strong>Visit Type:</strong> {appointmentData.type}</p>
                                </div>
                            ) : (
                                <div>
                                    <h6>{appointmentData.doctor.name}</h6>
                                    <p className="mb-1"><strong>Specialization:</strong> {appointmentData.doctor.specialization}</p>
                                    <p className="mb-1"><strong>Doctor ID:</strong> {appointmentData.doctor.id}</p>
                                    <p className="mb-0"><strong>Consultation Type:</strong> {appointmentData.type}</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Chat */}
                    <Card className="medical-card" style={{ height: '300px' }}>
                        <Card.Header>
                            <FontAwesomeIcon icon="comments" className="me-2" />
                            Chat
                        </Card.Header>
                        <Card.Body className="d-flex flex-column p-0">
                            <div className="flex-grow-1 overflow-auto p-3">
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`mb-2 ${msg.type === 'system' ? 'text-muted' : ''}`}>
                                        <div className="d-flex justify-content-between">
                                            <small className="fw-bold">{msg.sender}</small>
                                            <small className="text-muted">{msg.timestamp}</small>
                                        </div>
                                        <div className="bg-light p-2 rounded mt-1">
                                            {msg.message}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="border-top p-3">
                                <form onSubmit={sendMessage} className="d-flex">
                                    <input
                                        type="text"
                                        className="form-control me-2"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <Button type="submit" variant="primary" size="sm">
                                        <FontAwesomeIcon icon="paper-plane" />
                                    </Button>
                                </form>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {callStatus === 'ended' && (
                <Row className="mt-4">
                    <Col>
                        <Alert variant="success" className="text-center">
                            <FontAwesomeIcon icon="check-circle" className="me-2" />
                            Consultation completed successfully. Duration: {formatDuration(callDuration)}
                        </Alert>
                    </Col>
                </Row>
            )}

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
        
        .video-controls {
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        }
        
        .video-controls .btn {
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255,255,255,0.3);
        }
      `}</style>
        </Container>
    );
};

export default VideoConsultation;