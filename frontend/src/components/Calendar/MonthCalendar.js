import React, { useMemo } from 'react';
import { Card, Row, Col, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function formatISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const WeekdayHeader = () => (
    <Row className="text-muted small fw-semibold gx-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <Col key={d} className="text-center">{d}</Col>
        ))}
    </Row>
);

export default function MonthCalendar({
    monthDate, // JS Date at any day of target month
    eventsByDate = {}, // { 'YYYY-MM-DD': number | array }
    onSelectDate,
    onPrev,
    onNext,
    titlePrefix = 'Appointments'
}) {
    const { weeks, monthLabel } = useMemo(() => {
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const firstWeekStart = new Date(start);
        firstWeekStart.setDate(start.getDate() - start.getDay()); // back to Sunday

        const lastWeekEnd = new Date(end);
        lastWeekEnd.setDate(end.getDate() + (6 - end.getDay())); // forward to Saturday

        const days = [];
        for (let d = new Date(firstWeekStart); d <= lastWeekEnd; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }
        const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        return { weeks, monthLabel };
    }, [monthDate]);

    const isSameMonth = (d) => d.getMonth() === monthDate.getMonth();

    return (
        <Card className="h-100 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <Button variant="outline-secondary" size="sm" onClick={onPrev}>
                        <FontAwesomeIcon icon="chevron-left" />
                    </Button>
                    <h5 className="mb-0">{monthLabel}</h5>
                    <Button variant="outline-secondary" size="sm" onClick={onNext}>
                        <FontAwesomeIcon icon="chevron-right" />
                    </Button>
                </div>
                <div className="text-muted small">
                    <FontAwesomeIcon icon="calendar" className="me-1" /> {titlePrefix}
                </div>
            </Card.Header>
            <Card.Body>
                <WeekdayHeader />
                {weeks.map((week, wi) => (
                    <Row key={wi} className="gx-2 mb-2">
                        {week.map((d, di) => {
                            const key = formatISO(d);
                            const count = Array.isArray(eventsByDate[key]) ? eventsByDate[key].length : (eventsByDate[key] || 0);
                            const muted = !isSameMonth(d);
                            return (
                                <Col key={di} className={`border rounded p-2 text-center calendar-cell ${muted ? 'bg-light text-muted' : ''}`} style={{ minHeight: 72, cursor: 'pointer' }} onClick={() => onSelectDate && onSelectDate(key)}>
                                    <div className="d-flex justify-content-between align-items-start">
                                        <span className="small fw-semibold">{d.getDate()}</span>
                                        {count > 0 && (
                                            <Badge bg={count > 3 ? 'danger' : count > 1 ? 'warning' : 'info'}>
                                                {count}
                                            </Badge>
                                        )}
                                    </div>
                                </Col>
                            );
                        })}
                    </Row>
                ))}
            </Card.Body>
        </Card>
    );
}
