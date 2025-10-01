import React, { useState } from 'react';
import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
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

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            phone: formData.phone,
            specialization: formData.specialization,
            experience: formData.experience,
            licenseNumber: formData.licenseNumber
        });

        if (result.success) {
            // Navigate to login page with success message
            navigate('/login', { state: { registered: true, email: formData.email } });
        } else {
            setError(result.error || 'Registration failed. Please try again.');
        }

        setLoading(false);
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
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Create a password"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon="lock" className="me-2" />
                                    Confirm Password
                                </Form.Label>
                                <Form.Control
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Confirm your password"
                                    required
                                />
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