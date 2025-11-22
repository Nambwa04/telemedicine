import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Spinner, Form, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const EmergencyButton = ({ variant = 'floating', size = 'large' }) => {
    const [showModal, setShowModal] = useState(false);
    const [location, setLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [callingStatus, setCallingStatus] = useState(null);

    useEffect(() => {
        // Get user info from localStorage
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        setUserInfo(user);
    }, []);

    const getUserLocation = () => {
        setLoadingLocation(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setLoadingLocation(false);
            },
            (error) => {
                let errorMessage = 'Unable to retrieve your location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                    default:
                        errorMessage = 'An unknown error occurred.';
                }
                setLocationError(errorMessage);
                setLoadingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleEmergencyClick = () => {
        setShowModal(true);
        getUserLocation();
    };

    const handleCall999 = () => {
        setCallingStatus('calling');
        // Initiate call to 999
        window.location.href = 'tel:999';
        setTimeout(() => {
            setCallingStatus('called');
        }, 1000);
    };

    const handleCallAlternative = (number) => {
        window.location.href = `tel:${number}`;
    };

    const getEmergencyContact = () => {
        if (userInfo && userInfo.emergency_contact) {
            const ec = userInfo.emergency_contact;
            if (ec.phone || ec.name) {
                return ec;
            }
        }
        return null;
    };

    const getLocationString = () => {
        if (!location) return 'Location unavailable';
        return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    };

    const copyLocationToClipboard = () => {
        if (location) {
            const locationText = `Latitude: ${location.latitude}, Longitude: ${location.longitude}`;
            navigator.clipboard.writeText(locationText);
            alert('Location copied to clipboard!');
        }
    };

    const openInMaps = () => {
        if (location) {
            const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
            window.open(url, '_blank');
        }
    };

    const buttonClass = variant === 'floating' 
        ? 'emergency-button-floating' 
        : 'emergency-button-inline';

    const buttonSize = size === 'large' ? 'lg' : 'md';

    return (
        <>
            {variant === 'floating' ? (
                <button
                    className={buttonClass}
                    onClick={handleEmergencyClick}
                    title="Emergency - Call 999"
                    aria-label="Emergency Services - Call 999"
                >
                    <FontAwesomeIcon icon="ambulance" className="emergency-icon" />
                    <span className="emergency-text">999</span>
                    <div className="emergency-pulse"></div>
                </button>
            ) : (
                <Button
                    variant="danger"
                    size={buttonSize}
                    onClick={handleEmergencyClick}
                    className="emergency-button-inline"
                >
                    <FontAwesomeIcon icon="ambulance" className="me-2" />
                    Emergency - Call 999
                </Button>
            )}

            <Modal 
                show={showModal} 
                onHide={() => setShowModal(false)} 
                size="lg"
                centered
                backdrop="static"
            >
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>
                        <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                        Emergency Services
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Alert variant="danger" className="mb-4">
                        <FontAwesomeIcon icon="exclamation-circle" className="me-2" />
                        <strong>For life-threatening emergencies, call 999 immediately!</strong>
                    </Alert>

                    {/* Primary Emergency Call */}
                    <div className="text-center mb-4 p-4 border rounded bg-light">
                        <h3 className="mb-3">
                            <FontAwesomeIcon icon="ambulance" className="text-danger me-2" />
                            Emergency Ambulance
                        </h3>
                        <Button
                            variant="danger"
                            size="lg"
                            className="w-100 py-3 mb-2"
                            onClick={handleCall999}
                            style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                        >
                            <FontAwesomeIcon icon="phone-alt" className="me-2" />
                            Call 999 Now
                        </Button>
                        {callingStatus === 'called' && (
                            <Alert variant="success" className="mt-2 mb-0">
                                <FontAwesomeIcon icon="check-circle" className="me-2" />
                                Emergency call initiated. Stay on the line.
                            </Alert>
                        )}
                    </div>

                    {/* Location Information */}
                    <div className="mb-4 p-3 border rounded">
                        <h5 className="mb-3">
                            <FontAwesomeIcon icon="map-marker-alt" className="text-primary me-2" />
                            Your Location
                        </h5>
                        
                        {loadingLocation && (
                            <div className="text-center">
                                <Spinner animation="border" size="sm" className="me-2" />
                                Getting your location...
                            </div>
                        )}

                        {locationError && (
                            <Alert variant="warning" className="mb-0">
                                <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                                {locationError}
                                <div className="mt-2">
                                    <Button size="sm" variant="outline-warning" onClick={getUserLocation}>
                                        Try Again
                                    </Button>
                                </div>
                            </Alert>
                        )}

                        {location && !loadingLocation && (
                            <div>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={getLocationString()}
                                    readOnly
                                    className="mb-2 font-monospace"
                                />
                                <div className="d-flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline-primary"
                                        onClick={copyLocationToClipboard}
                                    >
                                        <FontAwesomeIcon icon="copy" className="me-1" />
                                        Copy Coordinates
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline-primary"
                                        onClick={openInMaps}
                                    >
                                        <FontAwesomeIcon icon="map" className="me-1" />
                                        Open in Maps
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        onClick={getUserLocation}
                                    >
                                        <FontAwesomeIcon icon="sync-alt" className="me-1" />
                                        Refresh
                                    </Button>
                                </div>
                                <small className="text-muted d-block mt-2">
                                    Accuracy: ±{Math.round(location.accuracy)} meters
                                </small>
                            </div>
                        )}
                    </div>

                    {/* User Information */}
                    {userInfo && (
                        <div className="mb-4 p-3 border rounded bg-light">
                            <h5 className="mb-3">
                                <FontAwesomeIcon icon="user" className="text-info me-2" />
                                Your Information
                            </h5>
                            <ListGroup variant="flush">
                                <ListGroup.Item>
                                    <strong>Name:</strong> {userInfo.first_name} {userInfo.last_name}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Email:</strong> {userInfo.email}
                                </ListGroup.Item>
                                {userInfo.phone && (
                                    <ListGroup.Item>
                                        <strong>Phone:</strong> {userInfo.phone}
                                    </ListGroup.Item>
                                )}
                                {userInfo.primary_condition && (
                                    <ListGroup.Item>
                                        <strong>Medical Condition:</strong> {userInfo.primary_condition}
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </div>
                    )}

                    {/* Emergency Contact */}
                    {getEmergencyContact() && (
                        <div className="mb-4 p-3 border rounded">
                            <h5 className="mb-3">
                                <FontAwesomeIcon icon="address-book" className="text-success me-2" />
                                Emergency Contact
                            </h5>
                            <ListGroup variant="flush">
                                {getEmergencyContact().name && (
                                    <ListGroup.Item>
                                        <strong>Name:</strong> {getEmergencyContact().name}
                                    </ListGroup.Item>
                                )}
                                {getEmergencyContact().phone && (
                                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Phone:</strong> {getEmergencyContact().phone}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => handleCallAlternative(getEmergencyContact().phone)}
                                        >
                                            <FontAwesomeIcon icon="phone" className="me-1" />
                                            Call
                                        </Button>
                                    </ListGroup.Item>
                                )}
                                {getEmergencyContact().relationship && (
                                    <ListGroup.Item>
                                        <strong>Relationship:</strong> {getEmergencyContact().relationship}
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </div>
                    )}

                    {/* Alternative Emergency Numbers */}
                    <div className="p-3 border rounded">
                        <h6 className="mb-3">Other Emergency Services</h6>
                        <ListGroup>
                            <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                <div>
                                    <FontAwesomeIcon icon="hospital" className="text-primary me-2" />
                                    <strong>Police:</strong> 999 or 112
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={() => handleCallAlternative('112')}
                                >
                                    Call 112
                                </Button>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                <div>
                                    <FontAwesomeIcon icon="fire" className="text-danger me-2" />
                                    <strong>Fire Services:</strong> 999
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleCallAlternative('999')}
                                >
                                    Call 999
                                </Button>
                            </ListGroup.Item>
                        </ListGroup>
                    </div>

                    <Alert variant="info" className="mt-3 mb-0">
                        <FontAwesomeIcon icon="info-circle" className="me-2" />
                        <small>
                            <strong>Tip:</strong> Share your location coordinates with emergency services when they answer.
                            Keep your phone charged and accessible at all times.
                        </small>
                    </Alert>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                    <Button variant="danger" onClick={handleCall999}>
                        <FontAwesomeIcon icon="phone-alt" className="me-2" />
                        Call 999
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default EmergencyButton;
