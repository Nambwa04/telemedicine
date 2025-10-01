import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'patient'
    });
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.registered) {
            setInfo(`Account created successfully. You can now login${location.state.email ? ' with ' + location.state.email : ''}.`);
        }
    }, [location.state]);

    const roles = [
        { value: 'patient', label: 'Patient', icon: 'user', description: 'Access your health records and appointments' },
        { value: 'doctor', label: 'Doctor', icon: 'user-md', description: 'Manage patients and consultations' },
        { value: 'caregiver', label: 'Caregiver', icon: 'user-nurse', description: 'Provide care services' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleSelect = (role) => {
        setFormData(prev => ({ ...prev, role }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login({ email: formData.email, password: formData.password });
        setLoading(false);
        if (result.success) {
            const userRole = result.user.role; // authoritative role from backend
            const dashboardMap = {
                'patient': '/patient-dashboard',
                'doctor': '/doctor-dashboard',
                'caregiver': '/caregiver-dashboard'
            };
            navigate(dashboardMap[userRole] || '/');
        } else {
            setError(result.error || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="auth-container">
            <Card className="auth-card fade-in">
                <div className="auth-header">
                    <h2 className="auth-title">
                        <FontAwesomeIcon icon="heartbeat" className="me-2 text-primary" />
                        Welcome Back
                    </h2>
                    <p className="auth-subtitle">Sign in to access your TeleMed+ account</p>
                </div>

                {info && (
                    <Alert variant="success" className="alert-custom">
                        <FontAwesomeIcon icon="check-circle" className="me-2" />
                        {info}
                    </Alert>
                )}

                {error && (
                    <Alert variant="danger" className="alert-custom">
                        <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                        {error}
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    {/* Role Selection */}
                    <div className="role-selector">
                        <Form.Label className="fw-semibold mb-3">I am a:</Form.Label>
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
                            className="form-control"
                        />
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label>
                            <FontAwesomeIcon icon="lock" className="me-2" />
                            Password
                        </Form.Label>
                        <Form.Control
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Enter your password"
                            required
                            className="form-control"
                        />
                    </Form.Group>

                    <Button
                        type="submit"
                        className="btn-medical w-100 mb-3"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="sign-in-alt" className="me-2" />
                                Sign In
                            </>
                        )}
                    </Button>
                </Form>

                <div className="text-center">
                    <p className="mb-2">
                        <Link to="/forgot-password" className="text-primary text-decoration-none">
                            Forgot your password?
                        </Link>
                    </p>
                    <p>
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary text-decoration-none fw-semibold">
                            Sign up here
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Login;
