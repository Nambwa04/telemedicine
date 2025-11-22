import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import EmergencyButton from '../components/Common/EmergencyButton';

const features = [
    {
        icon: 'video',
        title: 'Virtual Consultations',
        text: 'Connect with healthcare professionals from the comfort of your home.'
    },
    {
        icon: 'heartbeat',
        title: 'Health Monitoring',
        text: 'Track vitals and health metrics over time in one secure place.'
    },
    {
        icon: 'calendar-check',
        title: 'Smart Scheduling',
        text: 'Book, manage, and attend appointments with a streamlined experience.'
    },
    {
        icon: 'user-nurse',
        title: 'Caregiver Support',
        text: 'Find qualified caregivers and manage ongoing care tasks easily.'
    }
];

const HomePage = () => {
    return (
        <div className="home-landing">
            {/* Floating Emergency Button */}
            <EmergencyButton variant="floating" size="large" />
            
            <section className="hero-section py-5">
                <Container>
                    <Row className="align-items-center">
                        <Col md={6} className="mb-4 mb-md-0">
                            <h1 className="display-5 fw-bold text-gradient">Your Digital Healthcare Companion</h1>
                            <p className="lead text-secondary mt-3">
                                TeleMed+ helps patients, doctors, and caregivers collaborate seamlessly through secure virtual care, scheduling, and real-time insights.
                            </p>
                            <div className="d-flex flex-wrap gap-3 mt-4">
                                <Button as={Link} to="/register" variant="primary" size="lg" className="px-4 shadow-sm">
                                    Get Started
                                </Button>
                                <Button as={Link} to="/login" variant="outline-primary" size="lg" className="px-4">
                                    Login
                                </Button>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="hero-visual rounded-4 shadow-sm p-4">
                                <Row className="g-3 small-metrics">
                                    <Col xs={6}>
                                        <div className="stat-tile">
                                            <FontAwesomeIcon icon="user-md" className="stat-icon text-primary" />
                                            <h4 className="mb-0">+120</h4>
                                            <small>Licensed Doctors</small>
                                        </div>
                                    </Col>
                                    <Col xs={6}>
                                        <div className="stat-tile">
                                            <FontAwesomeIcon icon="user-nurse" className="stat-icon text-info" />
                                            <h4 className="mb-0">+85</h4>
                                            <small>Caregivers</small>
                                        </div>
                                    </Col>
                                    <Col xs={6}>
                                        <div className="stat-tile">
                                            <FontAwesomeIcon icon="calendar-check" className="stat-icon text-success" />
                                            <h4 className="mb-0">5k+</h4>
                                            <small>Appointments</small>
                                        </div>
                                    </Col>
                                    <Col xs={6}>
                                        <div className="stat-tile">
                                            <FontAwesomeIcon icon="heartbeat" className="stat-icon text-danger" />
                                            <h4 className="mb-0">24/7</h4>
                                            <small>Remote Monitoring</small>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            <section className="features-section py-5 bg-light">
                <Container>
                    <h2 className="text-center fw-bold mb-4">Why TeleMed+?</h2>
                    <Row className="g-4">
                        {features.map((f, idx) => (
                            <Col md={6} lg={3} key={idx}>
                                <Card className="feature-card h-100 shadow-sm border-0">
                                    <Card.Body>
                                        <div className="feature-icon mb-3">
                                            <FontAwesomeIcon icon={f.icon} />
                                        </div>
                                        <h5 className="fw-semibold">{f.title}</h5>
                                        <p className="text-muted small mb-0">{f.text}</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            <section className="cta-section py-5">
                <Container className="text-center">
                    <h2 className="fw-bold mb-3">Ready to experience modern connected care?</h2>
                    <p className="text-muted mb-4">Join thousands using TeleMed+ to improve outcomes and simplify collaboration.</p>
                    <Button as={Link} to="/register" size="lg" variant="primary" className="px-5">
                        Create Your Account
                    </Button>
                </Container>
            </section>
        </div>
    );
};

export default HomePage;
