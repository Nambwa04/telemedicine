import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Alert, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { fetchUserProfile, updateUserProfile } from '../../services/profileService';
import { uploadMyVerificationDocument } from '../../services/verificationService';

const ProfileManagement = () => {
    const { user, updateUser, refreshUserProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        primaryCondition: '',
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
    const [isFetching, setIsFetching] = useState(true);
    const [showEditPersonal, setShowEditPersonal] = useState(false);

    // Caregiver verification state
    const [docUploading, setDocUploading] = useState(false);
    const [docUploadError, setDocUploadError] = useState(null);
    const [docFile, setDocFile] = useState(null);
    const [docType, setDocType] = useState('');
    const [docNote, setDocNote] = useState('');

    // Professional profile edit state (caregivers)
    const [profEditMode, setProfEditMode] = useState(false);
    const [profSaving, setProfSaving] = useState(false);
    const [profFieldErrors, setProfFieldErrors] = useState({});
    const [profForm, setProfForm] = useState({
        experience_years: user?.experience_years ?? 0,
        specializations: Array.isArray(user?.specializations) ? user.specializations.join(', ') : '',
        hourly_rate: user?.hourly_rate ?? '',
        bio: user?.bio || ''
    });
    useEffect(() => {
        setProfForm({
            experience_years: user?.experience_years ?? 0,
            specializations: Array.isArray(user?.specializations) ? user.specializations.join(', ') : '',
            hourly_rate: user?.hourly_rate ?? '',
            bio: user?.bio || ''
        });
    }, [user?.experience_years, user?.specializations, user?.hourly_rate, user?.bio]);

    const getProfFieldError = (field) => {
        const v = profFieldErrors && profFieldErrors[field];
        if (!v) return '';
        if (Array.isArray(v)) return v.join(' ');
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch { return String(v); }
    };

    const handleSaveProfessional = async () => {
        try {
            setProfSaving(true);
            setProfFieldErrors({});
            const payload = {
                experience_years: Number(profForm.experience_years) || 0,
                specializations: profForm.specializations
                    ? profForm.specializations.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                hourly_rate: profForm.hourly_rate === '' ? 0 : Number(profForm.hourly_rate),
                bio: (profForm.bio ?? '').toString()
            };
            const res = await updateUser(payload);
            if (!res?.success) {
                if (res?.fieldErrors) setProfFieldErrors(res.fieldErrors);
                throw new Error(res?.error || 'Update failed');
            }
            await refreshUserProfile();
            setProfEditMode(false);
            addAlert('success', 'Professional profile updated.');
        } catch (e) {
            addAlert('danger', e?.message || 'Failed to update professional profile');
        } finally {
            setProfSaving(false);
        }
    };

    useEffect(() => {
        // Fetch user profile from backend
        const loadProfile = async () => {
            setIsFetching(true);
            try {
                const profileData = await fetchUserProfile();

                setFormData(prev => ({
                    ...prev,
                    firstName: profileData.firstName || '',
                    lastName: profileData.lastName || '',
                    email: profileData.email || '',
                    primaryCondition: profileData.primaryCondition || '',
                    // Preserve other fields that aren't in backend yet
                    phone: user?.phone || '',
                    address: user?.address || '',
                    dateOfBirth: user?.dateOfBirth || '',
                    gender: user?.gender || '',
                }));
            } catch (error) {
                addAlert('danger', 'Failed to load profile data');
            } finally {
                setIsFetching(false);
            }
        };

        if (user) {
            loadProfile();
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
        if (e && e.preventDefault) e.preventDefault();
        setIsLoading(true);

        try {
            // Update profile via backend API
            const updatedProfile = await updateUserProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                primaryCondition: formData.primaryCondition,
                phone: formData.phone,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                address: formData.address,
                emergencyContact: formData.emergencyContact
            });

            // Reflect saved values in the local summary immediately
            setFormData(prev => ({
                ...prev,
                firstName: updatedProfile.firstName || '',
                lastName: updatedProfile.lastName || '',
                primaryCondition: updatedProfile.primaryCondition || '',
                phone: updatedProfile.phone || '',
                dateOfBirth: updatedProfile.dateOfBirth || '',
                gender: updatedProfile.gender || '',
                address: updatedProfile.address || '',
                emergencyContact: {
                    name: updatedProfile.emergencyContact?.name || '',
                    phone: updatedProfile.emergencyContact?.phone || '',
                    relationship: updatedProfile.emergencyContact?.relationship || ''
                }
            }));

            // Refresh global user context so other pages reflect changes
            await refreshUserProfile();

            addAlert('success', 'Profile updated successfully!');
            setShowEditPersonal(false);
        } catch (error) {
            addAlert('danger', error.message || 'Failed to update profile. Please try again.');
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

    const handleUploadDoc = async () => {
        if (!docFile) { setDocUploadError('Please choose a file.'); return; }
        setDocUploading(true);
        setDocUploadError(null);
        try {
            await uploadMyVerificationDocument({ file: docFile, doc_type: docType, note: docNote });
            await refreshUserProfile();
            setDocFile(null); setDocType(''); setDocNote('');
            addAlert('success', 'Document uploaded. Admin will review it.');
        } catch (e) {
            setDocUploadError(e?.message || 'Upload failed');
        } finally {
            setDocUploading(false);
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

                                {(user?.role === 'caregiver' || user?.role === 'doctor') && (
                                    <button
                                        className={`list-group-item list-group-item-action ${activeTab === 'verification' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('verification')}
                                    >
                                        <FontAwesomeIcon icon="id-badge" className="me-2" />
                                        Verification
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
                    {/* Personal Information Tab */
                    }
                    {activeTab === 'profile' && (
                        <>
                            <Card className="medical-card mb-4">
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <FontAwesomeIcon icon="user" className="me-2" />
                                        Personal Information
                                    </div>
                                    <Button size="sm" className="gradient-primary" onClick={() => setShowEditPersonal(true)}>
                                        <FontAwesomeIcon icon="edit" className="me-1" /> Edit
                                    </Button>
                                </Card.Header>
                                <Card.Body>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="text-muted small">First Name</div>
                                            <div className="fw-semibold">{formData.firstName || '—'}</div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="text-muted small">Last Name</div>
                                            <div className="fw-semibold">{formData.lastName || '—'}</div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="text-muted small">Email</div>
                                            <div className="fw-semibold">{formData.email || '—'}</div>
                                        </Col>
                                        {user?.role === 'patient' && (
                                            <Col md={6}>
                                                <div className="text-muted small">Primary Condition</div>
                                                <div className="fw-semibold">{formData.primaryCondition || '—'}</div>
                                            </Col>
                                        )}
                                        <Col md={6}>
                                            <div className="text-muted small">Phone</div>
                                            <div className="fw-semibold">{formData.phone || '—'}</div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="text-muted small">Date of Birth</div>
                                            <div className="fw-semibold">{formData.dateOfBirth || '—'}</div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="text-muted small">Gender</div>
                                            <div className="fw-semibold">{formData.gender || '—'}</div>
                                        </Col>
                                        <Col md={12}>
                                            <div className="text-muted small">Address</div>
                                            <div className="fw-semibold">{formData.address || '—'}</div>
                                        </Col>
                                    </Row>

                                    <h5 className="mt-4 mb-3">Emergency Contact</h5>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="text-muted small">Name</div>
                                            <div className="fw-semibold">{formData.emergencyContact.name || '—'}</div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="text-muted small">Phone</div>
                                            <div className="fw-semibold">{formData.emergencyContact.phone || '—'}</div>
                                        </Col>
                                        <Col md={12}>
                                            <div className="text-muted small">Relationship</div>
                                            <div className="fw-semibold">{formData.emergencyContact.relationship || '—'}</div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Verification section moved to its own tab below */}

                            {user?.role === 'caregiver' && (
                                <Card className="medical-card">
                                    <Card.Header>
                                        <FontAwesomeIcon icon="id-badge" className="me-2" />
                                        Professional Profile
                                        <div className="float-end">
                                            {!profEditMode ? (
                                                <Button size="sm" variant="outline-primary" onClick={() => setProfEditMode(true)}>
                                                    <FontAwesomeIcon icon="edit" className="me-1" /> Edit
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button size="sm" variant="secondary" className="me-2" disabled={profSaving}
                                                        onClick={() => {
                                                            setProfEditMode(false); setProfFieldErrors({}); setProfForm({
                                                                experience_years: user?.experience_years ?? 0,
                                                                specializations: Array.isArray(user?.specializations) ? user.specializations.join(', ') : '',
                                                                hourly_rate: user?.hourly_rate ?? '',
                                                                bio: user?.bio || ''
                                                            });
                                                        }}>
                                                        Cancel
                                                    </Button>
                                                    <Button size="sm" className="gradient-primary" disabled={profSaving} onClick={handleSaveProfessional}>
                                                        {profSaving ? 'Saving…' : 'Save'}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </Card.Header>
                                    <Card.Body>
                                        {!profEditMode ? (
                                            <Row className="g-3">
                                                <Col md={6}>
                                                    <div className="text-muted small">Experience</div>
                                                    <div className="fw-semibold">{Number.isFinite(Number(user?.experience_years)) ? `${user.experience_years} years` : '—'}</div>
                                                </Col>
                                                <Col md={6}>
                                                    <div className="text-muted small">Specializations</div>
                                                    <div className="fw-semibold">{Array.isArray(user?.specializations) && user.specializations.length > 0 ? user.specializations.join(', ') : '—'}</div>
                                                </Col>
                                                <Col md={6}>
                                                    <div className="text-muted small">Hourly Rate</div>
                                                    <div className="fw-semibold">{
                                                        (() => {
                                                            const n = Number(user?.hourly_rate);
                                                            if (!Number.isFinite(n)) return 'Ksh —';
                                                            return `Ksh ${new Intl.NumberFormat('en-KE').format(Math.round(n))}`;
                                                        })()
                                                    }</div>
                                                </Col>
                                                <Col md={6}>
                                                    <div className="text-muted small">Availability</div>
                                                    <div className="fw-semibold">{user?.availability || 'Contact for availability'}</div>
                                                </Col>
                                                <Col md={12}>
                                                    <div className="text-muted small">Bio</div>
                                                    <div>{user?.bio || <span className="text-muted">—</span>}</div>
                                                </Col>
                                                <Col md={12} className="mt-2">
                                                    <div className="text-muted small">Location</div>
                                                    <div className="fw-semibold">
                                                        {user?.latitude != null && user?.longitude != null
                                                            ? `${Number(user.latitude).toFixed(5)}, ${Number(user.longitude).toFixed(5)}`
                                                            : '—'}
                                                        {user?.distance != null && (
                                                            <span className="text-muted"> · {Number(user.distance).toFixed(1)} km away</span>
                                                        )}
                                                    </div>
                                                </Col>
                                            </Row>
                                        ) : (
                                            <Form>
                                                <Row className="g-3">
                                                    <Col md={6}>
                                                        <Form.Group>
                                                            <Form.Label>Experience (years)</Form.Label>
                                                            <Form.Control
                                                                type="number"
                                                                min={0}
                                                                value={profForm.experience_years}
                                                                onChange={(e) => setProfForm(prev => ({ ...prev, experience_years: e.target.value }))}
                                                                isInvalid={!!getProfFieldError('experience_years')}
                                                            />
                                                            <Form.Control.Feedback type="invalid">{getProfFieldError('experience_years')}</Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group>
                                                            <Form.Label>Specializations</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                placeholder="e.g., Elder Care, Post-Surgery Care"
                                                                value={profForm.specializations}
                                                                onChange={(e) => setProfForm(prev => ({ ...prev, specializations: e.target.value }))}
                                                                isInvalid={!!getProfFieldError('specializations')}
                                                            />
                                                            <Form.Control.Feedback type="invalid">{getProfFieldError('specializations')}</Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group>
                                                            <Form.Label>Hourly Rate (Ksh)</Form.Label>
                                                            <Form.Control
                                                                type="number"
                                                                min={0}
                                                                step={1}
                                                                value={profForm.hourly_rate}
                                                                onChange={(e) => setProfForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                                                                isInvalid={!!getProfFieldError('hourly_rate')}
                                                            />
                                                            <Form.Control.Feedback type="invalid">{getProfFieldError('hourly_rate')}</Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={12}>
                                                        <Form.Group>
                                                            <Form.Label>Bio</Form.Label>
                                                            <Form.Control
                                                                as="textarea"
                                                                rows={3}
                                                                placeholder="Short professional bio..."
                                                                value={profForm.bio}
                                                                onChange={(e) => setProfForm(prev => ({ ...prev, bio: e.target.value }))}
                                                                isInvalid={!!getProfFieldError('bio')}
                                                            />
                                                            <Form.Control.Feedback type="invalid">{getProfFieldError('bio')}</Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={12}>
                                                        <div className="text-muted small">Availability</div>
                                                        <div className="text-muted small">Manage availability from the dashboard quick action for now.</div>
                                                    </Col>
                                                </Row>
                                            </Form>
                                        )}
                                    </Card.Body>
                                </Card>
                            )}
                        </>
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

                    {/* Verification Tab (Caregivers and Doctors) */}
                    {activeTab === 'verification' && (user?.role === 'caregiver' || user?.role === 'doctor') && (
                        <Card className="medical-card">
                            <Card.Header>
                                <FontAwesomeIcon icon="id-badge" className="me-2" />
                                Verification
                            </Card.Header>
                            <Card.Body>
                                <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        {user?.is_verified ? (
                                            <Badge bg="success">Verified {user?.role === 'doctor' ? 'Doctor' : 'Caregiver'}</Badge>
                                        ) : (
                                            <Badge bg="secondary">Not Verified</Badge>
                                        )}
                                        {user?.latest_verification_document_uploaded_at && (
                                            <small className="text-muted">
                                                · Doc uploaded: {new Date(user.latest_verification_document_uploaded_at).toLocaleString()}
                                            </small>
                                        )}
                                    </div>
                                    {user?.latest_verification_document_url && (
                                        <a href={user.latest_verification_document_url} target="_blank" rel="noreferrer">Latest Document</a>
                                    )}
                                </div>
                                {docUploadError && <div className="text-danger small mb-2">{docUploadError}</div>}
                                {!user?.latest_verification_document_uploaded_at && !user?.is_verified && (
                                    <div className="small text-muted mb-2">No document on file. Upload a professional credential to get verified.</div>
                                )}
                                <Row className="g-3">
                                    <Col md={12}>
                                        <Form.Control type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Control type="text" placeholder="Document Type (e.g., License)" value={docType} onChange={(e) => setDocType(e.target.value)} />
                                    </Col>
                                    <Col md={6}>
                                        <Form.Control as="textarea" rows={1} placeholder="Note (optional)" value={docNote} onChange={(e) => setDocNote(e.target.value)} />
                                    </Col>
                                </Row>
                                <div className="d-flex justify-content-end mt-3">
                                    <Button className="gradient-primary" disabled={docUploading} onClick={handleUploadDoc}>
                                        {docUploading ? 'Uploading…' : 'Upload Document'}
                                    </Button>
                                </div>
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

            {/* Edit Personal Information Modal */}
            <Modal show={showEditPersonal} onHide={() => setShowEditPersonal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="user" className="me-2" />
                        Edit Personal Information
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveProfile}>
                    <Modal.Body>
                        <Row>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>First Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange(null, 'firstName', e.target.value)}
                                        required
                                        disabled={isFetching}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Last Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange(null, 'lastName', e.target.value)}
                                        required
                                        disabled={isFetching}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        readOnly
                                        title="Email cannot be changed"
                                    />
                                    <Form.Text className="text-muted">
                                        Email cannot be changed
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            {user?.role === 'patient' && (
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>Primary Condition</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={formData.primaryCondition}
                                            onChange={(e) => handleInputChange(null, 'primaryCondition', e.target.value)}
                                            placeholder="e.g., Diabetes, Hypertension"
                                            disabled={isFetching}
                                        />
                                        <Form.Text className="text-muted">
                                            Your main health condition
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            )}
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Phone Number</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange(null, 'phone', e.target.value)}
                                        placeholder="e.g., +1234567890"
                                        disabled={isFetching}
                                    />
                                    <Form.Text className="text-muted">
                                        Your contact phone number
                                    </Form.Text>
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

                            <Col md={12} className="mb-2">
                                <h5 className="mt-2">Emergency Contact</h5>
                            </Col>
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
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEditPersonal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="gradient-primary" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <FontAwesomeIcon icon="spinner" spin className="me-1" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default ProfileManagement;