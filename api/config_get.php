<?php
// api/config_get.php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
session_start();

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tutor') {
    echo json_encode(['success' => false, 'message' => '[config_get.php] Accesso negato']);
    exit;
}

try {
    // 1. Dati profilo
    $stmt = $pdo->prepare('SELECT description, cost_online, cost_presenza FROM tutor WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $profile = $stmt->fetch();

    // 2. Elenco completo materie (per generare le checkbox)
    $stmt = $pdo->prepare('SELECT id, name FROM subject ORDER BY name ASC');
    $stmt->execute();
    $all_subjects = $stmt->fetchAll();

    // 3. Materie già selezionate dal tutor
    $stmt = $pdo->prepare('SELECT subject_id FROM tutor_subject WHERE tutor_id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $rows = $stmt->fetchAll();

    // Converto in array semplice di ID (es: [1, 3, 5])
    $my_subjects = array_map(function ($row) {
        return $row['subject_id'];
    }, $rows);

    echo json_encode([
        'success' => true,
        'profile' => $profile,
        'all_subjects' => $all_subjects,
        'my_subjects' => $my_subjects
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => '[config_get.php] Errore: ' . $e->getMessage()]);
}
