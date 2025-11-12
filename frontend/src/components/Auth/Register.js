import React, { useState } from 'react';
import { Form, Button, Card, Alert, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'patient',
        phone: '',
        specialization: '', // for doctors
        experience: '', // for caregivers
        licenseNumber: '' // for doctors
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, googleLogin } = useAuth();
    const navigate = useNavigate();

    const roles = [
        { value: 'patient', label: 'Patient', icon: 'user', description: 'Receive medical care and manage health' },
        { value: 'doctor', label: 'Doctor', icon: 'user-md', description: 'Provide medical consultations and care' },
        { value: 'caregiver', label: 'Caregiver', icon: 'user-nurse', description: 'Offer care and support services' }
    ];

    const specializations = [
        'General Medicine', 'Cardiology', 'Dermatology', 'Neurology',
        'Pediatrics', 'Psychiatry', 'Orthopedics', 'Gynecology'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRoleSelect = (role) => {
        setFormData(prev => ({
            ...prev,
            role
        }));
    };

    const validateForm = () => {
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setLoading(true);

        // Split name into first and last name
        const nameParts = formData.name.trim().split(/\s+/);
        const first_name = nameParts[0] || '';
        const last_name = nameParts.slice(1).join(' ') || '';

        const result = await register({
            first_name,
            last_name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            phone: formData.phone,
            primary_condition: formData.specialization || '', // For patients
        });

        if (result.success) {
            // Navigate to login page with success message
            navigate('/login', { state: { registered: true, email: formData.email } });
        } else {
            setError(result.error || 'Registration failed. Please try again.');
        }

        setLoading(false);
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setLoading(true);
        const result = await googleLogin(credentialResponse.credential, formData.role);
        setLoading(false);
        if (result.success) {
            navigate('/login', { state: { registered: true } });
        } else {
            setError(result.error || 'Google sign-up failed. Please try again.');
        }
    };

    const handleGoogleError = () => {
        setError('Google sign-up failed. Please try again.');
    };

    return (
        <div className="auth-container">
            <Card className="auth-card fade-in" style={{ maxWidth: '600px' }}>
                <div className="auth-header">
                    <h2 className="auth-title">
                        <FontAwesomeIcon icon="user-plus" className="me-2 text-primary" />
                        Create Account
                    </h2>
                    <p className="auth-subtitle">Join TeleMed+ and start your healthcare journey</p>
                </div>

                {error && (
                    <Alert variant="danger" className="alert-custom">
                        <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                        {error}
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    {/* Role Selection */}
                    <div className="role-selector">
                        <Form.Label className="fw-semibold mb-3">I want to register as a:</Form.Label>
                        <div className="row">
                            {roles.map((role) => (
                                <div key={role.value} className="col-12 mb-2">
                                    <div
                                        className={`role-option ${formData.role === role.value ? 'selected' : ''}`}
                                        data-role={role.value}
                                        onClick={() => handleRoleSelect(role.value)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <FontAwesomeIcon icon={role.icon} className="role-icon" />
                                        <div className="role-text">
                                            <div className="role-title">{role.label}</div>
                                            <div className="role-description">{role.description}</div>
                                        </div>
                                        {formData.role === role.value && (
                                            <FontAwesomeIcon icon="check-circle" className="text-primary ms-2" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon="user" className="me-2" />
                                    Full Name
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon="phone" className="me-2" />
                                    Phone Number
                                </Form.Label>
                                <Form.Control
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>
                            <FontAwesomeIcon icon="envelope" className="me-2" />
                            Email Address
                        </Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                            required
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon="lock" className="me-2" />
                                    Password
                                </Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Create a password"
                                        required
                                    />
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="password-toggle-btn"
                                    >
                                        <FontAwesomeIcon icon={showPassword ? "eye-slash" : "eye"} />
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon="lock" className="me-2" />
                                    Confirm Password
                                </Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Confirm your password"
                                        required
                                    />
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="password-toggle-btn"
                                    >
                                        <FontAwesomeIcon icon={showConfirmPassword ? "eye-slash" : "eye"} />
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Doctor-specific fields */}
                    {formData.role === 'doctor' && (
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon="stethoscope" className="me-2" />
                                        Specialization
                                    </Form.Label>
                                    <Form.Select
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select specialization</option>
                                        {specializations.map(spec => (
                                            <option key={spec} value={spec}>{spec}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon="certificate" className="me-2" />
                                        License Number
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="licenseNumber"
                                        value={formData.licenseNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter your license number"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    {/* Caregiver-specific fields */}
                    {formData.role === 'caregiver' && (
                        <Form.Group className="mb-3">
                            <Form.Label>
                                <FontAwesomeIcon icon="clock" className="me-2" />
                                Experience (Years)
                            </Form.Label>
                            <Form.Control
                                type="number"
                                name="experience"
                                value={formData.experience}
                                onChange={handleInputChange}
                                placeholder="Years of experience"
                                min="0"
                                required
                            />
                        </Form.Group>
                    )}

                    <Button
                        type="submit"
                        className="btn-medical w-100 mb-3"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Creating account...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="user-plus" className="me-2" />
                                Create Account
                            </>
                        )}
                    </Button>
                </Form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <div className="google-login-wrapper">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        text="signup_with"
                        width="100%"
                        logo_alignment="left"
                    />
                </div>

                <div className="text-center">
                    <p>
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary text-decoration-none fw-semibold">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Register;