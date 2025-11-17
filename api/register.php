<?php
// api/register.php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
session_start();

$input = json_decode(file_get_contents('php://input'),true) ?? [];
$role = trim($input['role'] ?? '');
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

if (!$username || !$password || ($role != 'student' && $role != 'tutor')) {
    echo json_encode(['success' => false, 'message' => '[register.php]: Dati non validi']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    // controllo se esiste già un utente dello stesso tipo con stesso username
    $check_usr;
    if ($role == 'tutor')
        $check_usr = $pdo->prepare('SELECT id FROM tutor WHERE username = ?');
    else
        $check_usr = $pdo->prepare('SELECT id FROM student WHERE username = ?');
    
    $check_usr->execute([$username]);
    if ($check_usr->fetch()){
        echo json_encode(['success' => false, 'message' => '[register.php]: Username non disponibile']);
        exit;
    }
    
    // inserimento nel database
    if ($role == 'tutor'){
        $insert = $pdo->prepare('INSERT INTO tutor (username, password) VALUES (?, ?)');
        $insert->execute([$username, $hash]);
        echo json_encode(['success' => true, 'message' => '[register.php]: Tutor registrato']);
    }
    else {
        $insert = $pdo->prepare('INSERT INTO student (username, password) VALUES (?, ?)');
        $insert->execute([$username, $hash]);
        echo json_encode(['success' => true, 'message' => '[register.php]: Studente registrato']);
    }
}
catch (Exception $e){
    echo json_encode(['success' => false, 'message' => '[register.php]: Errore server', 'error' =>  $e->getMessage()]);
}