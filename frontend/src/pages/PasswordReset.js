import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import API_BASE from '../config';

const PasswordReset = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    // Step 1: Request reset link (if no token)
    const [email, setEmail] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState(false);
    const [requestError, setRequestError] = useState(null);

    // Step 2: Confirm new password (if token present)
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState(null);

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setRequestError(null);
        setRequestSuccess(false);

        if (!email) {
            setRequestError('Please enter your email address');
            return;
        }

        setRequestLoading(true);

        try {
            const response = await fetch(`${API_BASE}/accounts/password/reset/request/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.email?.[0] || data.detail || 'Failed to send reset email');
            }

            setRequestSuccess(true);
            setEmail('');

            // In development, show the token for testing
            if (data.token) {
                console.log('Password reset token (for testing):', data.token);
                console.log('Reset link:', `${window.location.origin}/password-reset?token=${data.token}`);
            }
        } catch (error) {
            console.error('Password reset request error:', error);
            setRequestError(error.message || 'Failed to send reset email. Please try again.');
        } finally {
            setRequestLoading(false);
        }
    };

    const handleConfirmReset = async (e) => {
        e.preventDefault();
        setResetError(null);
        setResetSuccess(false);

        // Validation
        if (!newPassword || !confirmPassword) {
            setResetError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setResetError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setResetError('Password must be at least 8 characters long');
            return;
        }

        setResetLoading(true);

        try {
            const response = await fetch(`${API_BASE}/accounts/password/reset/confirm/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    new_password: newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.token?.[0] ||
                    data.new_password?.[0] ||
                    data.non_field_errors?.[0] ||
                    data.detail ||
                    'Failed to reset password'
                );
            }

            setResetSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error) {
            console.error('Password reset confirm error:', error);
            setResetError(error.message || 'Failed to reset password. The link may be invalid or expired.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <Container>
                <Row className="justify-content-center">
                    <Col md={6} lg={5}>
                        <Card className="auth-card fade-in">
                            <Card.Body className="p-5">
                                <div className="text-center mb-4">
                                    <div className="mb-3">
                                        <FontAwesomeIcon
                                            icon="lock"
                                            size="3x"
                                            className="text-primary"
                                        />
                                    </div>
                                    <h2 className="fw-bold mb-2">
                                        {token ? 'Reset Your Password' : 'Forgot Password?'}
                                    </h2>
                                    <p className="text-muted">
                                        {token
                                            ? 'Enter your new password below'
                                            : 'Enter your email address and we\'ll send you a reset link'
                                        }
                                    </p>
                                </div>

                                {!token ? (
                                    // Step 1: Request Reset Link
                                    <>
                                        {requestSuccess && (
                                            <Alert variant="success" className="mb-3">
                                                <FontAwesomeIcon icon="check-circle" className="me-2" />
                                                Password reset email sent! Check your inbox for the reset link.
                                            </Alert>
                                        )}

                                        {requestError && (
                                            <Alert variant="danger" className="mb-3">
                                                <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                                                {requestError}
                                            </Alert>
                                        )}

                                        <Form onSubmit={handleRequestReset}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Email Address</Form.Label>
                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        <FontAwesomeIcon icon="envelope" />
                                                    </span>
                                                    <Form.Control
                                                        type="email"
                                                        placeholder="Enter your email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        disabled={requestLoading}
                                                        required
                                                    />
                                                </div>
                                            </Form.Group>

                                            <Button
                                                variant="primary"
                                                type="submit"
                                                className="w-100 mb-3 btn-gradient-primary"
                                                disabled={requestLoading}
                                            >
                                                {requestLoading ? (
                                                    <>
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            className="me-2"
                                                        />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FontAwesomeIcon icon="paper-plane" className="me-2" />
                                                        Send Reset Link
                                                    </>
                                                )}
                                            </Button>

                                            <div className="text-center">
                                                <Button
                                                    variant="link"
                                                    className="text-decoration-none"
                                                    onClick={() => navigate('/login')}
                                                >
                                                    <FontAwesomeIcon icon="arrow-left" className="me-2" />
                                                    Back to Login
                                                </Button>
                                            </div>
                                        </Form>
                                    </>
                                ) : (
                                    // Step 2: Confirm New Password
                                    <>
                                        {resetSuccess && (
                                            <Alert variant="success" className="mb-3">
                                                <FontAwesomeIcon icon="check-circle" className="me-2" />
                                                Password reset successful! Redirecting to login...
                                            </Alert>
                                        )}

                                        {resetError && (
                                            <Alert variant="danger" className="mb-3">
                                                <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                                                {resetError}
                                            </Alert>
                                        )}

                                        <Form onSubmit={handleConfirmReset}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>New Password</Form.Label>
                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        <FontAwesomeIcon icon="lock" />
                                                    </span>
                                                    <Form.Control
                                                        type="password"
                                                        placeholder="Enter new password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        disabled={resetLoading || resetSuccess}
                                                        required
                                                        minLength={8}
                                                    />
                                                </div>
                                                <Form.Text className="text-muted">
                                                    Must be at least 8 characters long
                                                </Form.Text>
                                            </Form.Group>

                                            <Form.Group className="mb-3">
                                                <Form.Label>Confirm Password</Form.Label>
                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        <FontAwesomeIcon icon="lock" />
                                                    </span>
                                                    <Form.Control
                                                        type="password"
                                                        placeholder="Confirm new password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        disabled={resetLoading || resetSuccess}
                                                        required
                                                    />
                                                </div>
                                            </Form.Group>

                                            <Button
                                                variant="primary"
                                                type="submit"
                                                className="w-100 mb-3 btn-gradient-primary"
                                                disabled={resetLoading || resetSuccess}
                                            >
                                                {resetLoading ? (
                                                    <>
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            className="me-2"
                                                        />
                                                        Resetting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FontAwesomeIcon icon="check" className="me-2" />
                                                        Reset Password
                                                    </>
                                                )}
                                            </Button>

                                            {!resetSuccess && (
                                                <div className="text-center">
                                                    <Button
                                                        variant="link"
                                                        className="text-decoration-none"
                                                        onClick={() => navigate('/login')}
                                                    >
                                                        <FontAwesomeIcon icon="arrow-left" className="me-2" />
                                                        Back to Login
                                                    </Button>
                                                </div>
                                            )}
                                        </Form>
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default PasswordReset;
