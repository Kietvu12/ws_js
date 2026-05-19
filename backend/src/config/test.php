<?php
/**
 * Lấy danh sách bản ghi usersTool theo thiết bị.
 * - Bắt buộc: mathietbi (GET hoặc POST) → trả về mọi tool của thiết bị đó.
 * - Tùy chọn: matool → chỉ một dòng khớp cả thiết bị và mã tool.
 */
header('Content-Type: application/json; charset=utf-8');

include 'config.inc.php';
include 'User.php';

$mathietbi = trim((string) ($_GET['mathietbi'] ?? $_POST['mathietbi'] ?? ''));
$matool = trim((string) ($_GET['matool'] ?? $_POST['matool'] ?? ''));

if ($mathietbi === '') {
    echo json_encode([
        'success' => 0,
        'message' => 'Thiếu tham số mathietbi',
        'data' => [],
    ]);
    exit;
}

if ($matool !== '') {
    $query = 'SELECT * FROM usersTool WHERE cl_ma_thiet_bi = :mathietbi AND cl_ma_tool = :matool';
    $query_params = [
        ':mathietbi' => $mathietbi,
        ':matool' => $matool,
    ];
} else {
    $query = 'SELECT * FROM usersTool WHERE cl_ma_thiet_bi = :mathietbi';
    $query_params = [
        ':mathietbi' => $mathietbi,
    ];
}

try {
    $stmt = $db->prepare($query);
    $stmt->execute($query_params);
} catch (PDOException $ex) {
    echo json_encode([
        'success' => 0,
        'message' => 'Database Error. Please Try Again!',
        'data' => [],
    ]);
    exit;
}

$mangUS = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $mangUS[] = new User(
        $row['cl_ma_thiet_bi'],
        $row['cl_ma_tool'],
        $row['cl_ten_san_pham'],
        $row['cl_ho_ten'],
        $row['cl_sdt'],
        $row['cl_gmail'],
        $row['cl_chuc_vu'],
        $row['cl_noi_lam_viec'],
        $row['cl_ngay_dang_ky'],
        $row['cl_ngay_het_han'],
        $row['cl_che_do'],
        $row['cl_mat_khau'],
        $row['cl_phan_mem_cho_phep'],
        $row['cl_web_can_chan'],
        $row['cl_web_cho_chay'],
        $row['cl_pm_da_chan'],
        $row['cl_web_da_chan'],
        $row['cl_trang_thai'],
        $row['cl_lich_su_web'],
        $row['cl_thoi_gian_bat'],
        $row['cl_thoi_gian_tat']
    );
}

echo json_encode($mangUS);
