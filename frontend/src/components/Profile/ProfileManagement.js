import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Alert, Modal, Table, Image } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';

const ProfileManagement = () => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        gender: '',
        emergencyContact: {
            name: '',
            phone: '',
            relationship: ''
        },
        medicalInfo: {
            allergies: '',
            bloodType: '',
            chronicConditions: '',
            insurance: ''
        },
        preferences: {
            notifications: {
                email: true,
                sms: false,
                push: true
            },
            privacy: {
                shareData: false,
                profileVisibility: 'private'
            },
            language: 'en',
            timezone: 'UTC-8'
        }
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Initialize form with user data
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                dateOfBirth: user.dateOfBirth || '',
                gender: user.gender || '',
                emergencyContact: user.emergencyContact || {
                    name: '',
                    phone: '',
                    relationship: ''
                },
                medicalInfo: user.medicalInfo || {
                    allergies: '',
                    bloodType: '',
                    chronicConditions: '',
                    insurance: ''
                },
                preferences: user.preferences || {
                    notifications: {
                        email: true,
                        sms: false,
                        push: true
                    },
                    privacy: {
                        shareData: false,
                        profileVisibility: 'private'
                    },
                    language: 'en',
                    timezone: 'UTC-8'
                }
            });
        }
    }, [user]);

    const handleInputChange = (section, field, value) => {
        if (section) {
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleNestedInputChange = (section, subsection, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [subsection]: {
                    ...prev[section][subsection],
                    [field]: value
                }
            }
        }));
    };

    const addAlert = (type, message) => {
        const id = Date.now();
        setAlerts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setAlerts(prev => prev.filter(alert => alert.id !== id));
        }, 5000);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update user context
            await updateUser({ ...user, ...formData });

            addAlert('success', 'Profile updated successfully!');
        } catch (error) {
            addAlert('danger', 'Failed to update profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            addAlert('danger', 'New passwords do not match.');
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            addAlert('danger', 'New password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            addAlert('success', 'Password changed successfully!');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setShowChangePassword(false);
        } catch (error) {
            addAlert('danger', 'Failed to change password. Please check your current password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            addAlert('success', 'Account deletion initiated. You will receive a confirmation email.');
            setShowDeleteModal(false);
        } catch (error) {
            addAlert('danger', 'Failed to delete account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'patient': return 'primary';
            case 'doctor': return 'success';
            case 'caregiver': return 'info';
            default: return 'secondary';
        }
    };

    return (
        <Container fluid className="fade-in">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>
                                <FontAwesomeIcon icon="user-cog" className="me-2 text-primary" />
                                Profile Management
                            </h2>
                            <p className="text-muted">Manage your account settings and preferences</p>
                        </div>
                        <div>
                            <Badge bg={getRoleColor(user?.role)} className="fs-6">
                                <FontAwesomeIcon icon="shield-alt" className="me-1" />
                                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                            </Badge>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Alerts */}
            {alerts.map(alert => (
                <Alert key={alert.id} variant={alert.type} dismissible>
                    {alert.message}
                </Alert>
            ))}

            {/* Profile Tabs */}
            <Row>
                <Col lg={3} className="mb-4">
                    <Card className="medical-card">
                        <Card.Body>
                            <div className="text-center mb-3">
                                <div className="profile-avatar mb-3">
                                    <FontAwesomeIcon icon="user-circle" size="5x" className="text-primary" />
                                </div>
                                <h5>{user?.name}</h5>
                                <p className="text-muted">{user?.email}</p>
                                <Badge bg={getRoleColor(user?.role)}>
                                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                                </Badge>
                            </div>

                            <div className="list-group list-group-flush">
                                <button
                                    className={`list-group-item list-group-item-action ${activeTab === 'profile' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('profile')}
                                >
                                    <FontAwesomeIcon icon="user" className="me-2" />
                                    Personal Information
                                </button>

                                {user?.role === 'patient' && (
                                    <button
                                        className={`list-group-item list-group-item-action ${activeTab === 'medical' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('medical')}
                                    >
                                        <FontAwesomeIcon icon="heartbeat" className="me-2" />
                                        Medical Information
                                    </button>
                                )}

                                <button
                                    className={`list-group-item list-group-item-action ${activeTab === 'preferences' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('preferences')}
                                >
                                    <FontAwesomeIcon icon="cog" className="me-2" />
                                    Preferences
                                </button>

                                <button
                                    className={`list-group-item list-group-item-action ${activeTab === 'security' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('security')}
                                >
                                    <FontAwesomeIcon icon="shield-alt" className="me-2" />
                                    Security
                                </button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={9}>
                    {/* Personal Information Tab */}
                    {activeTab === 'profile' && (
                        <Card className="medical-card">
                            <Card.Header>
                                <FontAwesomeIcon icon="user" className="me-2" />
                                Personal Information
                            </Card.Header>
                            <Card.Body>
                                <Form onSubmit={handleSaveProfile}>
                                    <Row>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Full Name</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => handleInputChange(null, 'name', e.target.value)}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Email Address</Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => handleInputChange(null, 'email', e.target.value)}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Phone Number</Form.Label>
                                                <Form.Control
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => handleInputChange(null, 'phone', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Date of Birth</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    value={formData.dateOfBirth}
                                                    onChange={(e) => handleInputChange(null, 'dateOfBirth', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Gender</Form.Label>
                                                <Form.Select
                                                    value={formData.gender}
                                                    onChange={(e) => handleInputChange(null, 'gender', e.target.value)}
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Address</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={2}
                                                    value={formData.address}
                                                    onChange={(e) => handleInputChange(null, 'address', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <h5 className="mt-4 mb-3">Emergency Contact</h5>
                                    <Row>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Contact Name</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={formData.emergencyContact.name}
                                                    onChange={(e) => handleInputChange('emergencyContact', 'name', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Contact Phone</Form.Label>
                                                <Form.Control
                                                    type="tel"
                                                    value={formData.emergencyContact.phone}
                                                    onChange={(e) => handleInputChange('emergencyContact', 'phone', e.target.value)}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Relationship</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={formData.emergencyContact.relationship}
                                                    onChange={(e) => handleInputChange('emergencyContact', 'relationship', e.target.value)}
                                                    placeholder="e.g., Spouse, Parent, Sibling"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <div className="d-flex justify-content-end">
                                        <Button type="submit" variant="primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <FontAwesomeIcon icon="spinner" spin className="me-1" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon="save" className="me-1" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Medical Information Tab (Patients Only) */}
                    {activeTab === 'medical' && user?.role === 'patient' && (
                        <Card className="medical-card">
                            <Card.Header>
                                <FontAwesomeIcon icon="heartbeat" className="me-2" />
                                Medical Information
                            </Card.Header>
                            <Card.Body>
                                <Form onSubmit={handleSaveProfile}>
                                    <Row>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Blood Type</Form.Label>
                                                <Form.Select
                                                    value={formData.medicalInfo.bloodType}
                                                    onChange={(e) => handleInputChange('medicalInfo', 'bloodType', e.target.value)}
                                                >
                                                    <option value="">Select Blood Type</option>
                                                    <option value="A+">A+</option>
                                                    <option value="A-">A-</option>
                                                    <option value="B+">B+</option>
                                                    <option value="B-">B-</option>
                                                    <option value="AB+">AB+</option>
                                                    <option value="AB-">AB-</option>
                                                    <option value="O+">O+</option>
                                                    <option value="O-">O-</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Insurance Provider</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={formData.medicalInfo.insurance}
                                                    onChange={(e) => handleInputChange('medicalInfo', 'insurance', e.target.value)}
                                                    placeholder="Insurance company name"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Allergies</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    value={formData.medicalInfo.allergies}
                                                    onChange={(e) => handleInputChange('medicalInfo', 'allergies', e.target.value)}
                                                    placeholder="List any known allergies..."
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Chronic Conditions</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    value={formData.medicalInfo.chronicConditions}
                                                    onChange={(e) => handleInputChange('medicalInfo', 'chronicConditions', e.target.value)}
                                                    placeholder="List any chronic conditions..."
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <div className="d-flex justify-content-end">
                                        <Button type="submit" variant="primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <FontAwesomeIcon icon="spinner" spin className="me-1" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon="save" className="me-1" />
                                                    Save Medical Info
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <Card className="medical-card">
                            <Card.Header>
                                <FontAwesomeIcon icon="cog" className="me-2" />
                                Preferences & Settings
                            </Card.Header>
                            <Card.Body>
                                <Form onSubmit={handleSaveProfile}>
                                    <h5 className="mb-3">Notifications</h5>
                                    <Row className="mb-4">
                                        <Col md={12}>
                                            <Form.Check
                                                type="checkbox"
                                                id="email-notifications"
                                                label="Email notifications"
                                                checked={formData.preferences.notifications.email}
                                                onChange={(e) => handleNestedInputChange('preferences', 'notifications', 'email', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="sms-notifications"
                                                label="SMS notifications"
                                                checked={formData.preferences.notifications.sms}
                                                onChange={(e) => handleNestedInputChange('preferences', 'notifications', 'sms', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="push-notifications"
                                                label="Push notifications"
                                                checked={formData.preferences.notifications.push}
                                                onChange={(e) => handleNestedInputChange('preferences', 'notifications', 'push', e.target.checked)}
                                            />
                                        </Col>
                                    </Row>

                                    <h5 className="mb-3">Privacy</h5>
                                    <Row className="mb-4">
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Profile Visibility</Form.Label>
                                                <Form.Select
                                                    value={formData.preferences.privacy.profileVisibility}
                                                    onChange={(e) => handleNestedInputChange('preferences', 'privacy', 'profileVisibility', e.target.value)}
                                                >
                                                    <option value="private">Private</option>
                                                    <option value="healthcare-providers">Healthcare Providers Only</option>
                                                    <option value="public">Public</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Check
                                                type="checkbox"
                                                id="share-data"
                                                label="Share anonymized data for research"
                                                checked={formData.preferences.privacy.shareData}
                                                onChange={(e) => handleNestedInputChange('preferences', 'privacy', 'shareData', e.target.checked)}
                                            />
                                        </Col>
                                    </Row>

                                    <h5 className="mb-3">Regional Settings</h5>
                                    <Row>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Language</Form.Label>
                                                <Form.Select
                                                    value={formData.preferences.language}
                                                    onChange={(e) => handleInputChange('preferences', 'language', e.target.value)}
                                                >
                                                    <option value="en">English</option>
                                                    <option value="es">Spanish</option>
                                                    <option value="fr">French</option>
                                                    <option value="de">German</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Timezone</Form.Label>
                                                <Form.Select
                                                    value={formData.preferences.timezone}
                                                    onChange={(e) => handleInputChange('preferences', 'timezone', e.target.value)}
                                                >
                                                    <option value="UTC-8">Pacific Time (UTC-8)</option>
                                                    <option value="UTC-7">Mountain Time (UTC-7)</option>
                                                    <option value="UTC-6">Central Time (UTC-6)</option>
                                                    <option value="UTC-5">Eastern Time (UTC-5)</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <div className="d-flex justify-content-end">
                                        <Button type="submit" variant="primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <FontAwesomeIcon icon="spinner" spin className="me-1" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon="save" className="me-1" />
                                                    Save Preferences
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <Card className="medical-card">
                            <Card.Header>
                                <FontAwesomeIcon icon="shield-alt" className="me-2" />
                                Security Settings
                            </Card.Header>
                            <Card.Body>
                                <Row>
                                    <Col md={12} className="mb-4">
                                        <h5>Password</h5>
                                        <p className="text-muted">Keep your account secure with a strong password.</p>
                                        <Button
                                            variant="outline-primary"
                                            onClick={() => setShowChangePassword(true)}
                                        >
                                            <FontAwesomeIcon icon="key" className="me-1" />
                                            Change Password
                                        </Button>
                                    </Col>

                                    <Col md={12} className="mb-4">
                                        <h5>Account Status</h5>
                                        <p className="text-muted">Your account is active and verified.</p>
                                        <Badge bg="success">
                                            <FontAwesomeIcon icon="check-circle" className="me-1" />
                                            Verified Account
                                        </Badge>
                                    </Col>

                                    <Col md={12}>
                                        <h5 className="text-danger">Danger Zone</h5>
                                        <p className="text-muted">These actions cannot be undone.</p>
                                        <Button
                                            variant="outline-danger"
                                            onClick={() => setShowDeleteModal(true)}
                                        >
                                            <FontAwesomeIcon icon="trash" className="me-1" />
                                            Delete Account
                                        </Button>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Change Password Modal */}
            <Modal show={showChangePassword} onHide={() => setShowChangePassword(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="key" className="me-2" />
                        Change Password
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleChangePassword}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm(prev => ({
                                    ...prev,
                                    currentPassword: e.target.value
                                }))}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm(prev => ({
                                    ...prev,
                                    newPassword: e.target.value
                                }))}
                                required
                                minLength={8}
                            />
                            <Form.Text className="text-muted">
                                Password must be at least 8 characters long.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm(prev => ({
                                    ...prev,
                                    confirmPassword: e.target.value
                                }))}
                                required
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowChangePassword(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <FontAwesomeIcon icon="spinner" spin className="me-1" />
                                    Changing...
                                </>
                            ) : (
                                'Change Password'
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Account Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title className="text-danger">
                        <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                        Delete Account
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="danger">
                        <FontAwesomeIcon icon="warning" className="me-2" />
                        This action cannot be undone. All your data will be permanently deleted.
                    </Alert>
                    <p>Are you sure you want to delete your account? You will:</p>
                    <ul>
                        <li>Lose access to all your medical records</li>
                        <li>Cancel all scheduled appointments</li>
                        <li>Remove all connections with healthcare providers</li>
                        <li>Delete all personal data and preferences</li>
                    </ul>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteAccount} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <FontAwesomeIcon icon="spinner" spin className="me-1" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Account'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ProfileManagement;