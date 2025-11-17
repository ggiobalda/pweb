<?php
// api/bookings_cancel.php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
session_start();

// controllo credenziali
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') {
    echo json_encode(['success' => false, 'message' => '[bookings_cancel.php] Accesso negato']);
    exit;
}

// recupero e controllo input
$input = json_decode(file_get_contents('php://input'), true);
$booking_id = (int)($input['booking_id']);
if (!$booking_id || $booking_id <= 0) {
    echo json_encode(['success' => false, 'message' => '[bookings_cancel.php] Prenotazione non valida']);
    exit;
}

try {
    // verifica che la prenotazione esista e appartenga allo studente
    $sql = '
        SELECT id
        FROM bookings
        WHERE id = ? AND student_id = ?
        ';
    $check_booking = $pdo->prepare($sql);
    $check_booking->execute([$booking_id, $_SESSION['user_id']]);
    if ((int)$check_booking->fetchColumn() === 0) {
        echo json_encode(['success' => false, 'message' => '[bookings_cancel.php] Prenotazione non trovata']);
        exit;
    }

    // cancellazione prenotazione
    $pdo->beginTransaction();
    $sql = '
        DELETE FROM bookings
        WHERE id = ?
        ';
    $delete = $pdo->prepare($sql);
    $delete->execute([$booking_id]);
    $pdo->commit();
    echo json_encode(['success' => true, 'message' => '[bookings_cancel.php] Prenotazione cancellata con successo']);

}
catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => '[bookings_cancel.php] Errore server']);
}