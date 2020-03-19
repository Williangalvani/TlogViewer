/* eslint-disable max-len */
import {Matrix3} from './matrix3'
import {Vector3} from './vector3'

// eslint-disable-next-line
window.degrees = function (a) {
    return 57.2958 * a
}

window.radians = function (a) {
    return 0.0174533 * a
}

// convert m/s to Km/h
window.kmh = function (mps) {
    return mps * 3.6
}

window.getParam = function (name, default_) {
    if (!(name in window.params)) {
        return default_
    }
    return window.params[name]
}

// calculate barometric altitude
window.altitude = function (SCALED_PRESSURE, groundPressure, groundTemp) {
    if (groundPressure === undefined) {
        if (!('GND_ABS_PRESS' in window.params)) {
            return 0
        }
    }
    groundPressure = window.params['GND_ABS_PRESS']
    if (groundTemp === undefined) {
        if ('GND_ABS_PRESS' in window.params) {
            groundTemp = window.params['GND_TEMP']
        }
    }
    let scaling = groundPressure / (SCALED_PRESSURE.press_abs * 100.0)
    let temp = groundTemp + 273.15
    return Math.log(scaling) * temp * 29271.267 * 0.001
}

window.altitude2 = function (SCALED_PRESSURE, groundPressure, groundTemp) {
    // calculate barometric altitude'
    if (groundPressure == null) {
        if (window.params['GND_ABS_PRESS'] === null) {
            return 0
        }
    }
    groundPressure = window.getParam('GND_ABS_PRESS', 1)
    if (groundTemp === null) {
        groundTemp = window.getParam('GND_TEMP', 0)
    }
    let scaling = SCALED_PRESSURE.press_abs * 100.0 / groundPressure
    let temp = groundTemp + 273.15
    return 153.8462 * temp * (1.0 - Math.exp(0.190259 * Math.log(scaling)))
}

window.mag_heading = function (RAW_IMU, ATTITUDE, declination, SENSOR_OFFSETS, ofs) {
    // calculate heading from raw magnetometer
    if (declination === undefined) {
        declination = window.degrees(window.params['COMPASS_DEC'])
    }
    let magX = RAW_IMU.xmag
    let magY = RAW_IMU.ymag
    let magZ = RAW_IMU.zmag
    if (SENSOR_OFFSETS !== undefined && ofs !== undefined) {
        magX += ofs[0] - SENSOR_OFFSETS.mag_ofs_x
        magY += ofs[1] - SENSOR_OFFSETS.mag_ofs_y
        magZ += ofs[2] - SENSOR_OFFSETS.mag_ofs_z
    }

    // go via a DCM matrix to match the APM calculation
    let dcmMatrix = (new Matrix3()).fromEuler(ATTITUDE.roll, ATTITUDE.pitch, ATTITUDE.yaw)
    let cosPitchSqr = 1.0 - (dcmMatrix.e(6) * dcmMatrix.e(6))
    let headY = magY * dcmMatrix.e(8) - magZ * dcmMatrix.e(7)
    let headX = magX * cosPitchSqr - dcmMatrix.e(6) * (magY * dcmMatrix.e(7) + magZ * dcmMatrix.e(8))
    let heading = window.degrees(Math.atan2(-headY, headX)) + declination
    if (heading < -180) {
        heading += 360
    }
    return heading
}

window.mag_heading_df = function (MAG, ATT, declination, SENSOR_OFFSETS, ofs) {
    // calculate heading from raw magnetometer
    if (declination === undefined) {
        declination = window.degrees(window.params['COMPASS_DEC'])
    }
    let magX = MAG.MagX
    let magY = MAG.MagY
    let magZ = MAG.MagZ
    if (SENSOR_OFFSETS !== undefined && ofs !== undefined) {
        magX += ofs[0] - SENSOR_OFFSETS.mag_ofs_x
        magY += ofs[1] - SENSOR_OFFSETS.mag_ofs_y
        magZ += ofs[2] - SENSOR_OFFSETS.mag_ofs_z
    }

    // go via a DCM matrix to match the APM calculation
    let dcmMatrix = (new Matrix3()).fromEuler(
        window.radians(ATT.Roll),
        window.radians(ATT.Pitch),
        window.radians(ATT.Yaw)
    )
    let cosPitchSqr = 1.0 - (dcmMatrix.e(6) * dcmMatrix.e(6))
    let headY = magY * dcmMatrix.e(8) - magZ * dcmMatrix.e(7)
    let headX = magX * cosPitchSqr - dcmMatrix.e(6) * (magY * dcmMatrix.e(7) + magZ * dcmMatrix.e(8))
    let heading = window.degrees(Math.atan2(-headY, headX)) + declination
    if (heading < 0) {
        heading += 360
    }
    return heading
}

window.mag_field = function (RAW_IMU, SENSOR_OFFSETS, ofs) {
    // calculate magnetic field strength from raw magnetometer'
    let magX = RAW_IMU.xmag
    let magY = RAW_IMU.ymag
    let magZ = RAW_IMU.zmag
    if (SENSOR_OFFSETS !== undefined) {
        magX += ofs[0] - SENSOR_OFFSETS.mag_ofs_x
        magY += ofs[1] - SENSOR_OFFSETS.mag_ofs_y
        magZ += ofs[2] - SENSOR_OFFSETS.mag_ofs_z
    }
    return Math.sqrt(magX ** 2 + magY ** 2 + magZ ** 2)
}

window.mag_field_df = function (MAG, ofs) {
// calculate magnetic field strength from raw magnetometer (dataflash version)'''
    return Math.sqrt(MAG.MagX ** 2 + MAG.MagY ** 2 + MAG.MagZ ** 2)
}

window.sqrt = Math.sqrt

window.lastLowpass = null
window.lowpass = function (variable, key, factor) {
    if (window.lastLowpass == null) {
        window.lastLowpass = variable
    } else {
        window.lastLowpass = factor * window.lastLowpass + (1.0 - factor) * variable
    }
    let ret = window.lastLowpass
    return ret
}

window.SAMPLING_RES = 10.0
window.SAMPLING_minLat = -90.0
window.SAMPLING_MAX_LAT = 90.0
window.SAMPLING_minLon = -180.0
window.SAMPLING_MAX_LON = 180.0

window.declination_table = [
    [149.10950, 139.10950, 129.10950, 119.10950, 109.10949, 99.10950, 89.10950, 79.10950, 69.10950, 59.10950, 49.10950, 39.10950, 29.10950, 19.10950, 9.10950, -0.89050, -10.89050, -20.89050, -30.89050, -40.89050, -50.89050, -60.89050, -70.89050, -80.89050, -90.89050, -100.89050, -110.89050, -120.89050, -130.89050, -140.89050, -150.89050, -160.89050, -170.89050, 179.10950, 169.10950, 159.10950, 149.10950],
    [129.37759, 117.14583, 106.01898, 95.84726, 86.44522, 77.63150, 69.24826, 61.16874, 53.29825, 45.57105, 37.94414, 30.38880, 22.88112, 15.39339, 7.88854, 0.31945, -7.36677, -15.22089, -23.28322, -31.57827, -40.11442, -48.88906, -57.89765, -67.14429, -76.65158, -86.46832, -96.67422, -107.38079, -118.72599, -130.85732, -143.89431, -157.86353, -172.61739, 172.21319, 157.16190, 142.76170, 129.37759],
    [85.60184, 77.69003, 71.32207, 65.86993, 60.92414, 56.17033, 51.35320, 46.28164, 40.84704, 35.03587, 28.92623, 22.66416, 16.41848, 10.31921, 4.39763, -1.44271, -7.40082, -13.70324, -20.51470, -27.87783, -35.70713, -43.83304, -52.06997, -60.27655, -68.39086, -76.44339, -84.56374, -93.00460, -102.21930, -113.07088, -127.37057, -149.05145, 176.63172, 138.21637, 112.07842, 96.22737, 85.60184],
    [47.72047, 46.41844, 44.94283, 43.50977, 42.16271, 40.77290, 39.04552, 36.59993, 33.11430, 28.45556, 22.74662, 16.37046, 9.89648, 3.90131, -1.27904, -5.73319, -9.95573, -14.61164, -20.21833, -26.91079, -34.40272, -42.16094, -49.65783, -56.52405, -62.55849, -67.66009, -71.72876, -74.52850, -75.43728, -72.72706, -60.57997, -20.41341, 26.63644, 42.82781, 47.52694, 48.39676, 47.72047],
    [31.02920, 31.23624, 30.96588, 30.54974, 30.22312, 30.09074, 29.97250, 29.32817, 27.43015, 23.68926, 17.94459, 10.65044, 2.87620, -4.06486, -9.27368, -12.71750, -15.14455, -17.66990, -21.38496, -26.87077, -33.73354, -40.89381, -47.34608, -52.47467, -55.91656, -57.36320, -56.37027, -52.13926, -43.55753, -30.12705, -13.67554, 1.91730, 13.93567, 22.07926, 27.11546, 29.86289, 31.02920],
    [22.39580, 22.91483, 22.98471, 22.79294, 22.51132, 22.37364, 22.48467, 22.51169, 21.58462, 18.60470, 12.86231, 4.67251, -4.38742, -12.20529, -17.49574, -20.37578, -21.69620, -22.20533, -22.93466, -25.58202, -30.65181, -36.60256, -41.68581, -44.89480, -45.67065, -43.68591, -38.75262, -30.86937, -20.99711, -11.25673, -2.98341, 3.98182, 9.94668, 14.86513, 18.60975, 21.08265, 22.39580],
    [16.86268, 17.34487, 17.55107, 17.53468, 17.27224, 16.88812, 16.63481, 16.50963, 15.80216, 13.15648, 7.42999, -1.11751, -10.42072, -17.95472, -22.58300, -24.81140, -25.51932, -24.64114, -22.09731, -20.12401, -21.49578, -25.56754, -29.71013, -31.93909, -31.38680, -28.14427, -22.75379, -15.84114, -8.81817, -3.40017, 0.41409, 3.84742, 7.42617, 10.85398, 13.75385, 15.78065, 16.86268],
    [13.19097, 13.44856, 13.58422, 13.65261, 13.48939, 13.02568, 12.52149, 12.14860, 11.29753, 8.56495, 2.76096, -5.61344, -14.17225, -20.58114, -24.03412, -24.98709, -24.11858, -21.26636, -16.32028, -11.21874, -9.02165, -10.74849, -14.47798, -17.30779, -17.65042, -15.69359, -12.14311, -7.48791, -2.96526, -0.12587, 1.36049, 3.09789, 5.60507, 8.31685, 10.73216, 12.41267, 13.19097],
    [10.92623, 10.90181, 10.82333, 10.86460, 10.78695, 10.37670, 9.88910, 9.46007, 8.36291, 5.29505, -0.57591, -8.37062, -15.75003, -20.80957, -22.79710, -21.87616, -18.84351, -14.45358, -9.42840, -4.80202, -1.83473, -1.74130, -4.26028, -7.17479, -8.52577, -8.09283, -6.32284, -3.48771, -0.62426, 0.78982, 1.09893, 2.05326, 4.13896, 6.57935, 8.80977, 10.35435, 10.92623],
    [9.71011, 9.51881, 9.24068, 9.25106, 9.26720, 8.95743, 8.53646, 8.00522, 6.50726, 2.98362, -2.85308, -9.84907, -15.97767, -19.64088, -20.07848, -17.56993, -13.32746, -8.73278, -4.74905, -1.53742, 0.92858, 1.76616, 0.36916, -1.99224, -3.56114, -3.89436, -3.25158, -1.74963, -0.12369, 0.39195, 0.09209, 0.65986, 2.57335, 5.00216, 7.34943, 9.08114, 9.71011],
    [9.00312, 9.03132, 8.80862, 8.92740, 9.13380, 8.96714, 8.45876, 7.49648, 5.31405, 1.20550, -4.60853, -10.79680, -15.64160, -17.86099, -17.02957, -13.81388, -9.48335, -5.27860, -2.08821, 0.18491, 2.08754, 3.09405, 2.33958, 0.49969, -0.94208, -1.51458, -1.49063, -0.97753, -0.41673, -0.66423, -1.43031, -1.23789, 0.43821, 2.92085, 5.61318, 7.88479, 9.00312],
    [8.03874, 8.87718, 9.23144, 9.74451, 10.27560, 10.29756, 9.57016, 7.89237, 4.74571, -0.17093, -6.17240, -11.69433, -15.25467, -16.11759, -14.45574, -11.15430, -7.17811, -3.38526, -0.55632, 1.30997, 2.82221, 3.77763, 3.40183, 2.00714, 0.77788, 0.16424, -0.15468, -0.39946, -0.85273, -1.96753, -3.33820, -3.67623, -2.39633, 0.05772, 3.10388, 6.04655, 8.03874],
    [6.42021, 8.49313, 9.96485, 11.21264, 12.15378, 12.34411, 11.39654, 9.00192, 4.80210, -1.14083, -7.63429, -12.77860, -15.31639, -15.15258, -12.98558, -9.72317, -6.02652, -2.46224, 0.32036, 2.16718, 3.52576, 4.45316, 4.47022, 3.64413, 2.71916, 2.05267, 1.37415, 0.37187, -1.18524, -3.37771, -5.55055, -6.50029, -5.64204, -3.28034, -0.00971, 3.47278, 6.42021],
    [4.55870, 7.84457, 10.59505, 12.78315, 14.21311, 14.53879, 13.38981, 10.37263, 5.13228, -2.00167, -9.27410, -14.41195, -16.39580, -15.63899, -13.13217, -9.75841, -6.05603, -2.45211, 0.55836, 2.75052, 4.36042, 5.58048, 6.24404, 6.24213, 5.76940, 4.95204, 3.62521, 1.54168, -1.40447, -4.90584, -7.98277, -9.46456, -8.87577, -6.53558, -3.08458, 0.80580, 4.55870],
    [3.13967, 7.31097, 11.07216, 14.15725, 16.20221, 16.79070, 15.47250, 11.72257, 5.14656, -3.57391, -11.94254, -17.34882, -19.11810, -18.05435, -15.26042, -11.58179, -7.54393, -3.53438, 0.07849, 3.08157, 5.54519, 7.63184, 9.31427, 10.36791, 10.53101, 9.56965, 7.27456, 3.54700, -1.35789, -6.53724, -10.58593, -12.40763, -11.80293, -9.26734, -5.52522, -1.23338, 3.13967],
    [2.40982, 7.18541, 11.61646, 15.39834, 18.09395, 19.11444, 17.67695, 12.80844, 3.91551, -7.49296, -17.41503, -23.01926, -24.41774, -22.89374, -19.60750, -15.34185, -10.59502, -5.72094, -1.00157, 3.37937, 7.37061, 10.97982, 14.11553, 16.47981, 17.57833, 16.80075, 13.55567, 7.60935, -0.25054, -7.92815, -13.21489, -15.22877, -14.33921, -11.39247, -7.22465, -2.48217, 2.40982],
    [1.84909, 7.14349, 12.09954, 16.39700, 19.54576, 20.73345, 18.58921, 11.09809, -2.76476, -18.58691, -29.30539, -33.52891, -33.25409, -30.30365, -25.79412, -20.37504, -14.44263, -8.26365, -2.03561, 4.09039, 9.99389, 15.55055, 20.57404, 24.74657, 27.54152, 28.12085, 25.24078, 17.56424, 5.48335, -6.76322, -14.61951, -17.38523, -16.44524, -13.21307, -8.68808, -3.52579, 1.84909],
    [-0.07018, 5.11056, 9.81033, 13.43064, 14.95811, 12.44881, 2.42652, -17.21607, -37.22275, -47.59912, -50.02338, -48.04885, -43.68750, -37.95581, -31.39385, -24.31250, -16.90710, -9.31264, -1.63265, 6.04381, 13.62973, 21.02738, 28.11104, 34.69910, 40.50309, 45.02417, 47.32932, 45.58173, 36.48238, 17.86736, -1.80184, -12.43534, -15.24263, -13.75101, -10.05982, -5.28238, -0.07018],
    [-177.79784, -167.79784, -157.79784, -147.79784, -137.79784, -127.79784, -117.79784, -107.79784, -97.79784, -87.79784, -77.79784, -67.79784, -57.79784, -47.79784, -37.79784, -27.79784, -17.79784, -7.79784, 2.20217, 12.20217, 22.20217, 32.20217, 42.20217, 52.20217, 62.20217, 72.20217, 82.20217, 92.20217, 102.20217, 112.20217, 122.20217, 132.20217, 142.20217, 152.20217, 162.20217, 172.20217, -177.79784]
]

window.inclination_table = [
    [-72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447, -72.08447],
    [-78.33243, -77.56645, -76.64486, -75.60941, -74.49599, -73.33711, -72.16456, -71.01082, -69.90877, -68.88978, -67.98065, -67.20063, -66.55969, -66.05909, -65.69426, -65.45930, -65.35147, -65.37404, -65.53651, -65.85220, -66.33408, -66.99021, -67.82010, -68.81276, -69.94649, -71.18994, -72.50361, -73.84119, -75.15044, -76.37388, -77.45008, -78.31699, -78.91913, -79.21830, -79.20379, -78.89480, -78.33243],
    [-80.91847, -79.09801, -77.26826, -75.41050, -73.49957, -71.51974, -69.48020, -67.42760, -65.44927, -63.66181, -62.18407, -61.10090, -60.43119, -60.11709, -60.04466, -60.08935, -60.16521, -60.25535, -60.41391, -60.74312, -61.35672, -62.34264, -63.73840, -65.52698, -67.65072, -70.03207, -72.58967, -75.24472, -77.91857, -80.52353, -82.93966, -84.94483, -86.05606, -85.75384, -84.42566, -82.72116, -80.91847],
    [-77.51837, -75.51694, -73.59315, -71.68670, -69.71302, -67.57376, -65.19328, -62.57944, -59.87571, -57.36704, -55.41993, -54.35624, -54.29717, -55.07005, -56.26617, -57.42621, -58.22580, -58.56311, -58.55509, -58.48876, -58.73003, -59.58712, -61.19398, -63.49338, -66.31349, -69.46462, -72.79529, -76.19407, -79.56126, -82.77630, -85.61580, -87.26733, -86.31815, -84.15731, -81.85873, -79.63120, -77.51837],
    [-71.58980, -69.64769, -67.77321, -65.94443, -64.10554, -62.13602, -59.85758, -57.13808, -54.05141, -50.99340, -48.66453, -47.83440, -48.89447, -51.51382, -54.80435, -57.85064, -60.06631, -61.18986, -61.20437, -60.42942, -59.58264, -59.49073, -60.61581, -62.88772, -65.91135, -69.25190, -72.58760, -75.67681, -78.24048, -79.94645, -80.57004, -80.16984, -79.02581, -77.42625, -75.56790, -73.58591, -71.58980],
    [-64.35997, -62.39436, -60.44044, -58.48692, -56.55523, -54.62878, -52.55624, -50.07572, -47.03679, -43.74840, -41.19888, -40.75016, -43.15983, -47.79606, -53.17503, -58.10488, -62.07251, -64.81023, -65.90745, -65.16861, -63.23594, -61.51933, -61.25674, -62.70064, -65.25795, -68.11437, -70.67345, -72.55166, -73.47174, -73.47848, -72.95756, -72.18292, -71.16028, -69.83589, -68.20337, -66.33091, -64.35997],
    [-54.94450, -52.83610, -50.71907, -48.52548, -46.29540, -44.14811, -42.08032, -39.77454, -36.80280, -33.30065, -30.58530, -30.73124, -34.77290, -41.50404, -48.77340, -55.23978, -60.63675, -64.93033, -67.56104, -67.82610, -65.84530, -62.87774, -60.76994, -60.59320, -61.93831, -63.73453, -65.20081, -65.88752, -65.54695, -64.51690, -63.50867, -62.74044, -61.89461, -60.69909, -59.07143, -57.07765, -54.94450],
    [-42.10646, -39.67640, -37.35701, -34.97293, -32.46788, -30.02667, -27.76992, -25.30303, -22.01486, -18.09122, -15.32823, -16.39044, -22.30870, -31.32094, -40.74071, -48.83600, -55.18344, -59.91449, -62.78717, -63.30498, -61.42903, -57.98330, -54.69009, -53.10628, -53.23404, -54.07531, -54.84677, -54.97074, -54.01281, -52.44135, -51.30869, -50.77990, -50.14138, -48.93456, -47.08149, -44.68014, -42.10646],
    [-25.12461, -22.20972, -19.71770, -17.30812, -14.73074, -12.18096, -9.79096, -7.01347, -3.30221, 0.76014, 3.06841, 1.05911, -6.08614, -16.75791, -28.16035, -37.77466, -44.50466, -48.52854, -50.32132, -50.14678, -47.98684, -44.21133, -40.39026, -38.23866, -37.87010, -38.34407, -38.95664, -39.04699, -37.96969, -36.26974, -35.35719, -35.32784, -34.98679, -33.69969, -31.46052, -28.41042, -25.12461],
    [-4.97565, -1.60199, 0.92214, 3.11849, 5.46677, 7.81249, 10.07397, 12.84091, 16.38100, 19.76510, 21.12151, 18.61808, 11.61848, 1.03273, -10.71878, -20.60587, -26.95396, -29.87498, -30.40244, -29.49437, -27.12952, -23.19291, -19.13605, -16.84996, -16.43635, -16.86796, -17.51065, -17.78722, -16.98601, -15.63402, -15.29474, -15.99460, -16.17398, -15.02255, -12.56796, -8.96345, -4.97565],
    [14.91447, 18.35017, 20.72172, 22.57409, 24.52718, 26.56390, 28.61333, 31.02478, 33.78706, 36.01013, 36.36989, 33.79530, 27.90158, 19.21562, 9.54519, 1.38248, -3.71763, -5.61325, -5.28417, -3.97847, -1.76155, 1.76478, 5.44818, 7.52401, 7.87847, 7.51982, 7.00436, 6.66556, 7.01607, 7.64759, 7.26628, 5.87086, 4.95018, 5.43404, 7.43409, 10.86385, 14.91447],
    [31.20265, 34.13364, 36.24286, 37.87203, 39.58418, 41.50443, 43.52947, 45.65845, 47.68007, 48.91359, 48.52705, 46.02412, 41.42395, 35.29504, 28.85019, 23.50541, 20.17823, 19.13590, 19.80674, 21.15030, 22.94717, 25.52415, 28.20453, 29.75720, 30.04189, 29.82318, 29.56477, 29.39315, 29.46905, 29.45564, 28.53745, 26.73967, 25.15400, 24.67305, 25.61444, 27.99981, 31.20265],
    [43.45897, 45.53118, 47.31626, 48.90746, 50.63263, 52.61803, 54.74225, 56.79950, 58.45770, 59.16957, 58.40919, 56.07765, 52.56584, 48.52949, 44.70395, 41.69430, 39.88037, 39.44508, 40.12934, 41.29382, 42.64758, 44.29218, 45.93985, 46.96938, 47.25944, 47.23840, 47.23429, 47.28737, 47.30538, 46.94314, 45.73923, 43.78378, 41.82093, 40.58525, 40.46579, 41.54349, 43.45897],
    [53.18759, 54.43224, 55.88059, 57.49427, 59.34040, 61.41406, 63.57613, 65.58932, 67.09997, 67.62703, 66.81035, 64.77326, 62.07457, 59.34036, 57.01844, 55.33747, 54.40642, 54.27684, 54.81467, 55.68344, 56.63785, 57.64137, 58.61275, 59.35237, 59.79549, 60.08844, 60.36788, 60.60803, 60.61967, 60.08419, 58.75938, 56.80187, 54.74411, 53.13609, 52.31629, 52.38221, 53.18759],
    [62.00682, 62.70613, 63.84875, 65.37429, 67.21435, 69.25270, 71.31641, 73.17326, 74.49560, 74.88083, 74.10396, 72.39157, 70.27835, 68.26326, 66.64304, 65.52888, 64.93677, 64.84030, 65.14402, 65.67923, 66.29619, 66.93920, 67.60553, 68.28409, 68.96109, 69.62909, 70.24417, 70.67488, 70.69663, 70.07359, 68.73701, 66.90517, 64.98300, 63.35731, 62.27637, 61.83476, 62.00682],
    [70.71443, 71.15184, 72.02039, 73.27261, 74.82799, 76.56362, 78.31147, 79.84421, 80.85027, 81.00173, 80.21459, 78.77568, 77.10397, 75.52742, 74.23457, 73.30289, 72.74118, 72.51798, 72.57149, 72.82152, 73.19914, 73.67611, 74.26606, 74.99681, 75.87341, 76.84434, 77.77369, 78.43201, 78.54711, 77.95236, 76.72716, 75.15436, 73.56000, 72.20185, 71.23761, 70.73764, 70.71443],
    [79.00682, 79.29184, 79.87277, 80.71498, 81.76476, 82.94241, 84.12827, 85.13086, 85.65991, 85.46559, 84.62947, 83.45809, 82.20769, 81.03569, 80.03242, 79.24434, 78.68745, 78.35646, 78.23285, 78.29380, 78.52195, 78.91276, 79.47430, 80.21709, 81.13521, 82.18169, 83.23875, 84.08767, 84.43289, 84.09671, 83.21590, 82.09358, 80.98565, 80.05465, 79.39115, 79.03778, 79.00682],
    [86.14235, 86.25121, 86.50061, 86.87153, 87.33295, 87.83175, 88.26493, 88.44295, 88.20870, 87.65877, 86.96733, 86.23857, 85.52963, 84.87675, 84.30531, 83.83351, 83.47382, 83.23411, 83.11886, 83.13031, 83.26944, 83.53626, 83.92911, 84.44289, 85.06632, 85.77827, 86.54222, 87.29519, 87.92224, 88.23116, 88.09287, 87.66150, 87.15950, 86.71170, 86.37734, 86.18408, 86.14235],
    [88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502, 88.07502]
]

window.intensity_table = [
    [0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677, 0.54677],
    [0.60733, 0.60103, 0.59321, 0.58408, 0.57385, 0.56274, 0.55099, 0.53886, 0.52664, 0.51464, 0.50318, 0.49258, 0.48311, 0.47506, 0.46864, 0.46409, 0.46158, 0.46131, 0.46341, 0.46797, 0.47499, 0.48434, 0.49579, 0.50895, 0.52332, 0.53833, 0.55334, 0.56771, 0.58086, 0.59227, 0.60156, 0.60848, 0.61292, 0.61488, 0.61448, 0.61189, 0.60733],
    [0.63154, 0.61845, 0.60363, 0.58729, 0.56950, 0.55031, 0.52986, 0.50843, 0.48660, 0.46508, 0.44473, 0.42628, 0.41025, 0.39690, 0.38632, 0.37857, 0.37385, 0.37260, 0.37540, 0.38291, 0.39557, 0.41347, 0.43621, 0.46292, 0.49236, 0.52306, 0.55344, 0.58192, 0.60704, 0.62760, 0.64283, 0.65244, 0.65659, 0.65582, 0.65087, 0.64254, 0.63154],
    [0.62000, 0.60125, 0.58151, 0.56085, 0.53899, 0.51544, 0.48977, 0.46196, 0.43279, 0.40379, 0.37690, 0.35385, 0.33554, 0.32180, 0.31173, 0.30436, 0.29937, 0.29738, 0.29983, 0.30853, 0.32501, 0.34983, 0.38230, 0.42070, 0.46273, 0.50598, 0.54808, 0.58665, 0.61944, 0.64465, 0.66128, 0.66932, 0.66957, 0.66335, 0.65211, 0.63725, 0.62000],
    [0.58540, 0.56274, 0.53995, 0.51720, 0.49410, 0.46971, 0.44278, 0.41255, 0.37961, 0.34621, 0.31570, 0.29135, 0.27491, 0.26562, 0.26073, 0.25737, 0.25418, 0.25173, 0.25221, 0.25901, 0.27564, 0.30394, 0.34296, 0.38959, 0.43988, 0.49027, 0.53788, 0.58008, 0.61437, 0.63888, 0.65302, 0.65739, 0.65335, 0.64259, 0.62670, 0.60715, 0.58540],
    [0.53990, 0.51548, 0.49130, 0.46766, 0.44447, 0.42102, 0.39585, 0.36752, 0.33593, 0.30307, 0.27292, 0.25027, 0.23814, 0.23543, 0.23760, 0.24017, 0.24116, 0.24059, 0.23977, 0.24231, 0.25416, 0.28019, 0.32067, 0.37126, 0.42556, 0.47801, 0.52510, 0.56440, 0.59381, 0.61260, 0.62170, 0.62236, 0.61571, 0.60295, 0.58524, 0.56369, 0.53990],
    [0.48818, 0.46438, 0.44084, 0.41767, 0.39521, 0.37350, 0.35178, 0.32863, 0.30295, 0.27543, 0.24958, 0.23085, 0.22313, 0.22534, 0.23244, 0.24016, 0.24725, 0.25311, 0.25619, 0.25738, 0.26278, 0.28057, 0.31495, 0.36280, 0.41574, 0.46566, 0.50804, 0.54032, 0.56070, 0.57052, 0.57345, 0.57128, 0.56367, 0.55075, 0.53312, 0.51166, 0.48818],
    [0.43218, 0.41124, 0.39069, 0.37048, 0.35104, 0.33291, 0.31620, 0.29993, 0.28232, 0.26276, 0.24367, 0.22976, 0.22479, 0.22857, 0.23760, 0.24889, 0.26192, 0.27556, 0.28577, 0.28998, 0.29174, 0.29954, 0.32156, 0.35867, 0.40314, 0.44569, 0.48090, 0.50518, 0.51615, 0.51692, 0.51415, 0.50994, 0.50209, 0.48968, 0.47316, 0.45335, 0.43218],
    [0.37898, 0.36321, 0.34812, 0.33368, 0.32029, 0.30839, 0.29830, 0.28945, 0.28010, 0.26891, 0.25668, 0.24625, 0.24088, 0.24246, 0.25067, 0.26352, 0.27927, 0.29594, 0.30956, 0.31664, 0.31798, 0.31969, 0.33051, 0.35422, 0.38581, 0.41752, 0.44408, 0.46107, 0.46532, 0.46038, 0.45387, 0.44781, 0.43921, 0.42706, 0.41219, 0.39562, 0.37898],
    [0.34141, 0.33249, 0.32432, 0.31714, 0.31161, 0.30779, 0.30545, 0.30409, 0.30213, 0.29754, 0.28963, 0.27981, 0.27109, 0.26711, 0.27059, 0.28075, 0.29432, 0.30838, 0.32039, 0.32820, 0.33136, 0.33312, 0.33973, 0.35435, 0.37434, 0.39514, 0.41304, 0.42408, 0.42536, 0.41914, 0.41071, 0.40169, 0.39062, 0.37761, 0.36424, 0.35187, 0.34141],
    [0.32867, 0.32594, 0.32420, 0.32395, 0.32630, 0.33102, 0.33698, 0.34292, 0.34678, 0.34593, 0.33903, 0.32732, 0.31415, 0.30395, 0.30057, 0.30442, 0.31263, 0.32253, 0.33245, 0.34086, 0.34708, 0.35294, 0.36127, 0.37252, 0.38535, 0.39852, 0.41027, 0.41774, 0.41871, 0.41327, 0.40286, 0.38883, 0.37279, 0.35689, 0.34336, 0.33390, 0.32867],
    [0.34041, 0.34097, 0.34394, 0.34953, 0.35870, 0.37101, 0.38453, 0.39684, 0.40514, 0.40637, 0.39894, 0.38449, 0.36738, 0.35274, 0.34431, 0.34264, 0.34599, 0.35295, 0.36228, 0.37184, 0.38062, 0.38995, 0.40068, 0.41156, 0.42185, 0.43217, 0.44201, 0.44914, 0.45121, 0.44627, 0.43315, 0.41330, 0.39087, 0.37008, 0.35387, 0.34401, 0.34041],
    [0.37313, 0.37420, 0.38001, 0.39014, 0.40446, 0.42181, 0.43988, 0.45594, 0.46693, 0.46961, 0.46214, 0.44621, 0.42680, 0.40959, 0.39817, 0.39301, 0.39304, 0.39763, 0.40583, 0.41537, 0.42477, 0.43480, 0.44612, 0.45788, 0.46954, 0.48141, 0.49294, 0.50198, 0.50563, 0.50085, 0.48580, 0.46223, 0.43524, 0.41014, 0.39049, 0.37812, 0.37313],
    [0.42356, 0.42408, 0.43096, 0.44342, 0.46009, 0.47887, 0.49731, 0.51304, 0.52358, 0.52620, 0.51923, 0.50394, 0.48467, 0.46656, 0.45306, 0.44501, 0.44198, 0.44352, 0.44889, 0.45639, 0.46470, 0.47409, 0.48543, 0.49886, 0.51385, 0.52947, 0.54409, 0.55526, 0.56003, 0.55559, 0.54075, 0.51743, 0.49032, 0.46455, 0.44383, 0.43002, 0.42356],
    [0.48455, 0.48475, 0.49083, 0.50202, 0.51666, 0.53249, 0.54719, 0.55888, 0.56585, 0.56650, 0.55991, 0.54692, 0.53031, 0.51359, 0.49951, 0.48937, 0.48348, 0.48174, 0.48371, 0.48850, 0.49531, 0.50420, 0.51581, 0.53051, 0.54771, 0.56575, 0.58223, 0.59442, 0.59970, 0.59626, 0.58388, 0.56455, 0.54198, 0.52029, 0.50258, 0.49049, 0.48455],
    [0.54041, 0.54034, 0.54396, 0.55064, 0.55927, 0.56837, 0.57642, 0.58216, 0.58460, 0.58302, 0.57718, 0.56756, 0.55545, 0.54258, 0.53062, 0.52078, 0.51381, 0.51011, 0.50972, 0.51240, 0.51793, 0.52626, 0.53755, 0.55170, 0.56796, 0.58472, 0.59979, 0.61087, 0.61607, 0.61448, 0.60648, 0.59374, 0.57883, 0.56443, 0.55261, 0.54449, 0.54041],
    [0.57307, 0.57207, 0.57258, 0.57422, 0.57649, 0.57880, 0.58055, 0.58121, 0.58037, 0.57778, 0.57340, 0.56742, 0.56031, 0.55268, 0.54526, 0.53876, 0.53378, 0.53081, 0.53014, 0.53192, 0.53617, 0.54284, 0.55170, 0.56233, 0.57398, 0.58557, 0.59583, 0.60355, 0.60784, 0.60838, 0.60548, 0.60000, 0.59319, 0.58628, 0.58027, 0.57579, 0.57307],
    [0.57801, 0.57662, 0.57545, 0.57444, 0.57349, 0.57249, 0.57133, 0.56991, 0.56816, 0.56605, 0.56360, 0.56089, 0.55803, 0.55520, 0.55261, 0.55047, 0.54900, 0.54836, 0.54871, 0.55012, 0.55257, 0.55599, 0.56021, 0.56498, 0.56997, 0.57483, 0.57918, 0.58272, 0.58521, 0.58659, 0.58688, 0.58625, 0.58495, 0.58326, 0.58141, 0.57962, 0.57801],
    [0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612, 0.56612]
]

window.interpolate_table = function (table, lat, lon) {
    // interpolate inside a table for a given lat/lon in degrees
    // round down to nearest sampling resolution
    const minLat = Math.floor(Math.floor(lat / window.SAMPLING_RES) * window.SAMPLING_RES)
    const minLon = Math.floor(Math.floor(lon / window.SAMPLING_RES) * window.SAMPLING_RES)

    // find index of nearest low sampling point
    const minLatIndex = Math.floor(Math.floor(-(window.SAMPLING_minLat) + minLat) / window.SAMPLING_RES)
    const minLonIndex = Math.floor(Math.floor(-(window.SAMPLING_minLon) + minLon) / window.SAMPLING_RES)

    // calculate intensity
    const dataSw = table[minLatIndex][minLonIndex]
    const dataSe = table[minLatIndex][minLonIndex + 1]
    const dataNe = table[minLatIndex + 1][minLonIndex + 1]
    const dataNw = table[minLatIndex + 1][minLonIndex]

    // perform bilinear interpolation on the four grid corners
    const dataMin = ((lon - minLon) / window.SAMPLING_RES) * (dataSe - dataSw) + dataSw
    const dataMax = ((lon - minLon) / window.SAMPLING_RES) * (dataNe - dataNw) + dataNw

    const value = ((lat - minLat) / window.SAMPLING_RES) * (dataMax - dataMin) + dataMin
    return value
}

window.get_mag_field_ef = function (lat, lon) {
    // limit to table bounds
    if (lat < window.SAMPLING_minLat) {
        return null
    }
    if (lat >= window.SAMPLING_MAX_LAT) {
        return null
    }
    if (lon < window.SAMPLING_minLon) {
        return null
    }
    if (lon >= window.SAMPLING_MAX_LON) {
        return null
    }
    let intensityGauss, declinationDeg, inclinationDeg
    intensityGauss = window.interpolate_table(window.intensity_table, lat, lon)
    declinationDeg = window.interpolate_table(window.declination_table, lat, lon)
    inclinationDeg = window.interpolate_table(window.inclination_table, lat, lon)

    return [declinationDeg, inclinationDeg, intensityGauss]
}

window.earth_field = null

window.expected_earth_field = function (GPS) {
    // return expected magnetic field for a location
    if (window.earth_field !== null) {
        return window.earth_field
    }
    let gpsStatus, lat, lon, fieldVar, magEf, R
    if (GPS.fix_type !== undefined) {
        gpsStatus = GPS.fix_type
        lat = GPS.lat * 1.0e-7
        lon = GPS.lon * 1.0e-7
    } else {
        gpsStatus = GPS.Status
        lat = GPS.Lat
        lon = GPS.Lng
    }
    if (gpsStatus < 3) {
        return new Vector3(0, 0, 0)
    }
    fieldVar = window.get_mag_field_ef(lat, lon)
    magEf = new Vector3(fieldVar[2] * 1000.0, 0.0, 0.0)
    R = new Matrix3()
    R.fromEuler(0.0, -window.radians(fieldVar[1]), window.radians(fieldVar[0]))
    magEf = R.times(magEf)
    window.earth_field = magEf
    return window.earth_field
}

window.expected_mag = function (GPS, ATT, rollAdjust = 0, pitchAdjust = 0, yawAdjust = 0) {
    window.expected_earth_field(GPS)
    if (window.earth_field === null) {
        return new Vector3(0, 0, 0)
    }
    let roll, pitch, yaw, rot, field
    if (ATT.roll !== undefined) {
        roll = window.degrees(ATT.roll) + rollAdjust
        pitch = window.degrees(ATT.pitch) + pitchAdjust
        yaw = window.degrees(ATT.yaw) + yawAdjust
    } else {
        roll = ATT.Roll + rollAdjust
        pitch = ATT.Pitch + pitchAdjust
        yaw = ATT.Yaw + yawAdjust
    }
    rot = (new Matrix3()).fromEuler(window.radians(roll), window.radians(pitch), window.radians(yaw))
    field = rot.transposed().times(window.earth_field)
    return field
}
