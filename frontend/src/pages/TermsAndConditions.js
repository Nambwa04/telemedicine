import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileContract, faUserShield, faDatabase, faHandshake } from '@fortawesome/free-solid-svg-icons';

const TermsAndConditions = () => {
    return (
        <Container className="py-5">
            <Card className="shadow-sm border-0">
                <Card.Body className="p-5">
                    <div className="text-center mb-5">
                        <h1 className="display-4 text-primary mb-3">
                            <FontAwesomeIcon icon={faFileContract} className="me-3" />
                            Terms and Conditions
                        </h1>
                        <p className="lead text-muted">
                            Please read these terms carefully before using our telemedicine services.
                        </p>
                    </div>

                    <section className="mb-5">
                        <h3 className="text-secondary mb-3">
                            <FontAwesomeIcon icon={faHandshake} className="me-2" />
                            1. Ethics of Consent
                        </h3>
                        <p>
                            By using this platform, you acknowledge and agree to the following ethical standards regarding informed consent:
                        </p>
                        <ul>
                            <li><strong>Voluntary Participation:</strong> Your use of our telemedicine services is entirely voluntary. You have the right to withdraw your consent and discontinue services at any time without penalty.</li>
                            <li><strong>Informed Decision Making:</strong> You have the right to be fully informed about your medical condition, proposed treatments, potential risks, and benefits. Our healthcare providers are committed to explaining these aspects clearly to ensure you can make informed decisions.</li>
                            <li><strong>Capacity to Consent:</strong> We assume that all users are of legal age and have the mental capacity to consent to medical treatment. If you are accessing services on behalf of a minor or someone with diminished capacity, you must have the legal authority to do so.</li>
                            <li><strong>Telehealth Limitations:</strong> You acknowledge that telemedicine has limitations compared to in-person visits, such as the inability to perform a physical examination. You consent to receive care with these understandings.</li>
                        </ul>
                    </section>

                    <section className="mb-5">
                        <h3 className="text-secondary mb-3">
                            <FontAwesomeIcon icon={faUserShield} className="me-2" />
                            2. Data Privacy and Confidentiality
                        </h3>
                        <p>
                            We are committed to protecting your personal and health information in accordance with applicable data protection laws (e.g., HIPAA, GDPR).
                        </p>
                        <ul>
                            <li><strong>Data Collection:</strong> We collect only the data necessary to provide you with healthcare services, including personal identification, medical history, and consultation records.</li>
                            <li><strong>Confidentiality:</strong> Your medical records are confidential. We will not share your information with third parties without your explicit consent, except where required by law or for the continuity of your care (e.g., sharing with your primary care physician).</li>
                            <li><strong>Security Measures:</strong> We employ industry-standard encryption and security protocols to protect your data during transmission and storage.</li>
                        </ul>
                    </section>

                    <section className="mb-5">
                        <h3 className="text-secondary mb-3">
                            <FontAwesomeIcon icon={faDatabase} className="me-2" />
                            3. Data Deletion and Archiving
                        </h3>
                        <p>
                            We manage your data lifecycle with strict adherence to legal and ethical guidelines:
                        </p>
                        <ul>
                            <li><strong>Data Retention:</strong> Medical records are retained for a minimum period as required by law (typically 5-10 years depending on jurisdiction). After this period, data may be archived or securely destroyed.</li>
                            <li><strong>Archiving:</strong> Archived data is stored securely and is only accessible for legal or historical medical purposes. It is protected with the same level of security as active data.</li>
                            <li><strong>Right to Deletion (Right to be Forgotten):</strong> You have the right to request the deletion of your personal account data. However, please note that certain medical records must be retained by law and cannot be permanently deleted immediately upon request. These records will be securely archived and restricted from processing.</li>
                            <li><strong>Account Deactivation:</strong> Upon deactivating your account, your profile will be hidden, but your medical history will be preserved in our secure archives for the mandatory retention period.</li>
                        </ul>
                    </section>

                    <section className="mb-5">
                        <h3 className="text-secondary mb-3">
                            4. User Responsibilities
                        </h3>
                        <ul>
                            <li>You agree to provide accurate and complete information about your health history and current condition.</li>
                            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                            <li>You agree to use the platform only for lawful purposes and not to misuse the service.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-secondary mb-3">
                            5. Changes to Terms
                        </h3>
                        <p>
                            We reserve the right to modify these terms at any time. We will notify users of any significant changes. Continued use of the platform constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    <div className="text-center mt-5 text-muted">
                        <small>Last updated: December 2025</small>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default TermsAndConditions;
