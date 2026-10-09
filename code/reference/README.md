# Referensi versi sebelumnya

Salinan ini mempertahankan kode sebelum penyesuaian tiga sensor dan penamaan motor yang seragam. Sketch aktif berada pada folder `code/line_follower_pid`, `code/line_follower_bang_bang`, dan `code/test`.

- [PID lima sensor](line_follower_pid_5_sensor/line_follower_pid_5_sensor.ino): A0–A4; fungsi kiri/kanan masih memakai pemetaan lama.
- [Tes sensor lima sensor](sensor_test_5_sensor/sensor_test_5_sensor.ino): A1–A5.
- [Tes motor pemetaan sebelumnya](motor_test_previous_mapping/motor_test_previous_mapping.ino).

Jangan memakai diagram tiga sensor aktif sebagai wiring langsung untuk referensi lama. [Hardware aktif](../../hardware/README.md) memakai sensor A0/A1/A2, motor kiri IN10/9–EN11, dan motor kanan IN8/7–EN6.

- [Bang-bang dua sensor asli](line_follower_bang_bang_2_sensor/line_follower_bang_bang_2_sensor.ino): A3/A2, PWM 68, semua hitam langsung stop.
