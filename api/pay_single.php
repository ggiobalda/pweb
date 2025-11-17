<?php
// api/pay_single.php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
session_start();

// controllo credenziali
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tutor') {
    echo json_encode(['success' => false, 'message' => '[pay_single.php] Accesso negato']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$booking_id = $input['booking_id'];

try {
    // verifica che la lezione esista e appartenga al tutor
    $sql = '
        SELECT id
        FROM bookings
        WHERE id = ? AND tutor_id = ?
        ';
    $check_booking = $pdo->prepare($sql);
    $check_booking->execute([$booking_id, $_SESSION['user_id']]);
    if ((int)$check_booking->fetchColumn() === 0) {
        echo json_encode(['success' => false, 'message' => '[pay_single.php] Lezione non trovata']);
        exit;
    }

    // pagamento della lezione
    $pdo->beginTransaction();
    $sql = '
        INSERT INTO bookings (paid)
        VALUES (1)
        WHERE id = ?
    ';
    $statement = $pdo->prepare($sql);
    $statement->execute([$booking_id]);
    $pdo->commit();
    echo json_encode(['success' => true, 'message' => '[pay_single.php] Lezione pagata con successo']);
}
catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => '[pay_single.php] Errore server']);
}
