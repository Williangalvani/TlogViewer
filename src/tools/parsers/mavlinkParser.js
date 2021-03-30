/* eslint-disable no-undef */
import {MAVLink, mavlink} from 'mavlink_common_v1.0/mavlink'

let modeMappingApm = {
    0: 'MANUAL',
    1: 'CIRCLE',
    2: 'STABILIZE',
    3: 'TRAINING',
    4: 'ACRO',
    5: 'FBWA',
    6: 'FBWB',
    7: 'CRUISE',
    8: 'AUTOTUNE',
    10: 'AUTO',
    11: 'RTL',
    12: 'LOITER',
    14: 'LAND',
    15: 'GUIDED',
    16: 'INITIALISING',
    17: 'QSTABILIZE',
    18: 'QHOVER',
    19: 'QLOITER',
    20: 'QLAND',
    21: 'QRTL'
}
let modeMappingAcm = {
    0: 'STABILIZE',
    1: 'ACRO',
    2: 'ALT_HOLD',
    3: 'AUTO',
    4: 'GUIDED',
    5: 'LOITER',
    6: 'RTL',
    7: 'CIRCLE',
    8: 'POSITION',
    9: 'LAND',
    10: 'OF_LOITER',
    11: 'DRIFT',
    13: 'SPORT',
    14: 'FLIP',
    15: 'AUTOTUNE',
    16: 'POSHOLD',
    17: 'BRAKE',
    18: 'THROW',
    19: 'AVOID_ADSB',
    20: 'GUIDED_NOGPS',
    21: 'SMART_RTL'
}
let modeMappingRover = {
    0: 'MANUAL',
    2: 'LEARNING',
    3: 'STEERING',
    4: 'HOLD',
    10: 'AUTO',
    11: 'RTL',
    12: 'SMART_RTL',
    15: 'GUIDED',
    16: 'INITIALISING'
}

let modeMappingTracker = {
    0: 'MANUAL',
    1: 'STOP',
    2: 'SCAN',
    10: 'AUTO',
    16: 'INITIALISING'
}

let modeMappingSub = {
    0: 'STABILIZE',
    1: 'ACRO',
    2: 'ALT_HOLD',
    3: 'AUTO',
    4: 'GUIDED',
    7: 'CIRCLE',
    9: 'SURFACE',
    16: 'POSHOLD',
    19: 'MANUAL'
}

let vehicles = {
    1: 'airplane', // Fixed wing aircraft.
    2: 'quadcopter', // Quadrotor
    3: 'quadcopter', // Coaxial helicopter
    4: 'quadcopter', // Normal helicopter with tail rotor.
    5: 'tracker', // Ground installation
    10: 'rover', // Ground rover
    11: 'boat', // Surface vessel, boat, ship
    12: 'submarine', // Submarine
    13: 'quadcopter', // Hexarotor
    14: 'quadcopter', // Octorotor
    15: 'quadcopter', // Tricopter
    19: 'airplane', // Two-rotor VTOL using control surfaces in vertical operation in addition. Tailsitter.
    20: 'airplane', // Quad-rotor VTOL using a V-shaped quad config in vertical operation. Tailsitter.
    21: 'quadcopter', // Tiltrotor VTOL
    22: 'airplane',
    23: 'airplane',
    24: 'airplane',
    29: 'quadcopter' // Dodecarotor
}

function getModeMap (mavType) {
    let map
    if ([mavlink.MAV_TYPE_QUADROTOR,
        mavlink.MAV_TYPE_HELICOPTER,
        mavlink.MAV_TYPE_HEXAROTOR,
        mavlink.MAV_TYPE_OCTOROTOR,
        mavlink.MAV_TYPE_COAXIAL,
        mavlink.MAV_TYPE_TRICOPTER].includes(mavType)) {
        map = modeMappingAcm
    }
    if (mavType === mavlink.MAV_TYPE_FIXED_WING) {
        map = modeMappingApm
    }
    if ([mavlink.MAV_TYPE_GROUND_ROVER,
        mavlink.MAV_TYPE_SURFACE_BOAT].includes(mavType)) {
        map = modeMappingRover
    }
    if (mavType === mavlink.MAV_TYPE_ANTENNA_TRACKER) {
        map = modeMappingTracker
    }
    if (mavType === mavlink.MAV_TYPE_SUBMARINE) {
        map = modeMappingSub
    }
    if (map == null) {
        return null
    }
    return map
}

function getModeString (mavtype, cmode, basemode) {
    if (mavtype === mavlink.MAV_TYPE_GCS) {
        return ''
    }
    const map = getModeMap(mavtype)
    if (map === null) {
        if ((basemode & 4) > 0) {
            return 'Auto'
        }
        if ((basemode & 8) > 0) {
            return 'Guided'
        }
        if ((basemode & 16) > 0) {
            return 'Stabilize'
        }
        return 'Unknown'
    }
    try {
        return map[cmode]
    } catch {

    }
}

let instance

export class MavlinkParser {
    constructor () {
        this.messages = {}
        this.totalSize = undefined
        this.lastPercentage = 0
        this.sent = false

        this.mavlinkParser = new MAVLink()
        this.mavlinkParser.on('message', this.onMessage)
        this.maxPercentageInterval = 0.1
        instance = this
        instance.forcedTimeOffset = 0
        instance.lastTime = 0
    }

    static fixData (message) {
        if (message.name === 'GLOBAL_POSITION_INT') {
            message.lat = message.lat / 10000000
            message.lon = message.lon / 10000000
            // eslint-disable-next-line
            message.relative_alt = message.relative_alt / 1000
            return message
        } else if (message.name === 'HEARTBEAT') {
            message.asText = getModeString(message.type, message.custom_mode, message.base_mode)
            message.craft = vehicles[message.type]
            return message
        }
        delete message.crc
        delete message.crc_extra
        delete message.format
        delete message.header
        delete message.msgbuf
        delete message.id
        delete message.payload
        delete message.order_map
        return message
    }

    onMessage (messages) {
        let name = messages[0].name
        for (let message of messages) {
            if (instance.totalSize == null) { // for percentage calculation
                instance.totalSize = this.buf.byteLength
            }
            if (message.id !== -1) {
                // if (message.time_boot_ms === undefined) {
                //     message.time_boot_ms = instance.lastTime
                // }
                //
                // // TODO: Fix this logic, it is probably wrong.
                // if ((+message.time_boot_ms + instance.forcedTimeOffset) < instance.lastTime) {
                //     console.log(
                //     'Time going backwards detected, adding an offset.This means SYSTEM_TIME is now out of sync!')
                //     instance.forcedTimeOffset = +instance.lastTime - message.time_boot_ms + 100000
                // }

                if (+message.time_boot_ms < instance.lastTime) {
                    // eslint-disable-next-line
                    message.time_boot_ms = +message.time_boot_ms + instance.forcedTimeOffset
                }
                instance.lastTime = +message.time_boot_ms

                if (message.name in instance.messages) {
                    MavlinkParser.fixData(message)
                } else {
                    instance.messages[message.name] = [MavlinkParser.fixData(message)]
                }
                // TODO: FIX THIS!
                // This a hack to detect the end of the buffer and only them message the main thread
                if (this.buf.length < 100 && instance.sent === false) {
                    instance.sent = true
                }
            }
        }

        let fields = messages[0].fieldnames
        if (fields.indexOf('time_boot_ms') === -1) {
            fields.push('time_boot_ms')
        }
        if (messages[0].name === 'HEARTBEAT') {
            fields.push('asText')
            fields.push('craft')
        } else if (messages[0].name === 'SYSTEM_TIME') {
            fields.push('time_unix_usec')
        }
        let mergedData = {}
        for (let field of fields) {
            mergedData[field] = []
        }
        for (let message of messages) {
            for (let i = 0; i < fields.length; i++) {
                let fieldname = fields[i]
                mergedData[fieldname].push(message[fieldname])
            }
        }
        instance.messages[name] = mergedData
        self.postMessage({messages: instance.messages})
    }

    extractStartTime () {
        try {
            let length = instance.messages['SYSTEM_TIME'].time_boot_ms.length
            let lastmsg = instance.messages['SYSTEM_TIME'].time_unix_usec[length - 1]
            return new Date(lastmsg[0] / 1e3 + lastmsg[1] * ((2 ** 32) / 1e3))
        } catch {
            let timeUsec = instance.messages['GPS_RAW_INT'].time_boot_ms[0]
            return new Date(timeUsec * ((2 ** 32) / 1e3))
        }
    }

    processData (data) {
        this.mavlinkParser.pushBuffer(Buffer.from(data))
        let availableMessages = this.mavlinkParser.preParse()
        let preparseList = [
            'SYSTEM_TIME',
            'GLOBAL_POSITION_INT',
            'GPS_RAW_INT',
            'HEARTBEAT',
            'ATTITUDE',
            'AHRS',
            'PARAM_VALUE',
            'STATUSTEXT',
            'AHRS2',
            'AHRS3']
        for (let i in preparseList) {
            this.mavlinkParser.parseType(preparseList[i])
            self.postMessage({percentage: (i / preparseList.length) * 100})
        }
        self.postMessage({percentage: 100})
        let messageTypes = {}
        for (let msg of availableMessages) {
            let fields = mavlink.messageFields[msg]
            fields = fields.filter(e => e !== 'time_boot_ms' && e !== 'time_usec')
            let complexFields = {}
            for (let field in fields) {
                complexFields[fields[field]] = {
                    name: fields[field],
                    units: '?',
                    multiplier: 1
                }
            }
            messageTypes[msg] = {
                expressions: fields,
                units: null,
                multipliers: null,
                complexFields: complexFields
            }
        }
        let metadata = {
            startTime: this.extractStartTime()
        }

        self.postMessage({metadata: metadata})
        self.postMessage({availableMessages: messageTypes})
        // self.postMessage({done: true})
        return {types: messageTypes, messages: instance.messages}
    }

    loadType (type) {
        this.mavlinkParser.parseType(type)
        console.log('done')
    }
}
