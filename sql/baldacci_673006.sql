/****** crezione database ******/
DROP DATABASE if exists baldacci_673006;
CREATE DATABASE baldacci_673006;
USE baldacci_673006;

/****** tabella tutor e popolazione ******/
DROP TABLE IF EXISTS tutor;
CREATE TABLE tutor (
    id INT AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    description TEXT,
    cost_online DECIMAL(8,1) NOT NULL DEFAULT 20.0,
    cost_presenza DECIMAL(8,1) NOT NULL DEFAULT 20.0,
    PRIMARY KEY (id)
);
LOCK TABLES tutor WRITE;
INSERT INTO tutor (username, password, cost_online, cost_presenza) VALUES
('giorgio', '1234', 20.0, 25.0),
('matteo', '1234', 22.5, 26.5),
('luca', '1234', 18.0, 20.0);
UNLOCK TABLES;

/****** tabella subject e popolazione ******/
DROP TABLE IF EXISTS subject;
CREATE TABLE subject (
    id INT AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    PRIMARY KEY (id)
);
LOCK TABLES subject WRITE;
INSERT INTO subject (name) VALUES
('Matematica'),
('Fisica'),
('Chimica'),
('Informatica'),
('Biologia'),
('Storia'),
('Geografia'),
('Italiano'),
('Inglese'),
('Francese');
UNLOCK TABLES;

/****** tabella tutor_subject ******/
DROP TABLE IF EXISTS tutor_subject;
CREATE TABLE tutor_subject (
    tutor_id INT,
    subject_id INT,
    FOREIGN KEY (tutor_id) REFERENCES tutor(id),
    FOREIGN KEY (subject_id) REFERENCES subject(id)
);

/****** tabella student e popolazione ******/
DROP TABLE IF EXISTS student;
CREATE TABLE student (
    id INT AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);
LOCK TABLES student WRITE;
INSERT INTO student (username, password) VALUES
('paolo', '1234'),
('giulio', '1234'),
('jacopo', '1234'),
('gabriele', '1234'),
('andrea', '1234');
UNLOCK TABLES;

/****** tabella slots e popolazione ******/
DROP TABLE IF EXISTS slots;
CREATE TABLE slots (
    id INT AUTO_INCREMENT,
    tutor_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    mode VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (tutor_id) REFERENCES tutor(id) ON DELETE CASCADE
);
LOCK TABLES slots WRITE;
INSERT INTO slots (tutor_id, date, time, mode) VALUES
-- slot passati già prenotati
(1, '2025-10-02', '19:30:00', 'presenza'),
(1, '2025-10-04', '16:00:00', 'online'),
(1, '2025-10-07', '10:00:00', 'online'),
(2, '2025-10-01', '15:30:00', 'presenza'),
(2, '2025-10-05', '16:00:00', 'online'),
(2, '2025-10-09', '17:00:00', 'presenza'),
(3, '2025-10-03', '09:00:00', 'online'),
(3, '2025-10-06', '11:00:00', 'presenza'),
(3, '2025-10-08', '10:30:00', 'presenza'),
-- slot futuri prenotabili
(1, '2025-11-01', '15:45:00', 'presenza'),
(1, '2025-11-03', '09:00:00', 'both'),
(1, '2025-11-03', '10:00:00', 'both'),
(1, '2025-11-03', '11:00:00', 'both'),
(1, '2025-11-05', '16:00:00', 'online'),
(1, '2025-11-05', '17:00:00', 'oline'),
(2, '2025-11-03', '16:30:00', 'presenza'),
(2, '2025-11-04', '15:00:00', 'online'),
(2, '2025-11-13', '16:00:00', 'presenza'),
(2, '2025-11-24', '17:15:00', 'online'),
(2, '2025-11-27', '16:00:00', 'online'),
(3, '2025-11-01', '09:00:00', 'both'),
(3, '2025-11-01', '10:50:00', 'both'),
(3, '2025-11-01', '11:00:00', 'both'),
(3, '2025-11-02', '09:10:00', 'presenza'),
(3, '2025-11-02', '10:45:00', 'presenza'),
(3, '2025-11-02', '11:00:00', 'online');
UNLOCK TABLES;

/****** tabella bookings e popolazione ******/
DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
    id INT AUTO_INCREMENT,
    slot_id INT NOT NULL,
    student_id INT NOT NULL,
    chosenMode INT NOT NULL DEFAULT 0, -- 0=scelta obbligata, 1=online, 2=presenza
    paid BOOLEAN NOT NULL DEFAULT FALSE, 
    PRIMARY KEY (id),
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);
LOCK TABLES bookings WRITE;
INSERT INTO bookings (slot_id, student_id,paid) VALUES
(1, 1, FALSE),
(2, 2, FALSE),
(3, 3, FALSE),
(4, 1, TRUE),
(5, 2, TRUE),
(6, 3, FALSE),
(7, 1, FALSE),
(8, 1, TRUE),
(9, 1, FALSE);
UNLOCK TABLES;