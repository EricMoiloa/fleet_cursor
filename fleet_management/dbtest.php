<?php
try {
  $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=fleet_management','root','');
  $pdo->query('SELECT 1');
  echo "DB OK\n";
} catch (Throwable $e) {
  echo "DB FAIL: ".$e->getMessage()."\n";
}
