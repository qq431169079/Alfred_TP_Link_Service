/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');
const { Client } = require('tplink-smarthome-api');

/**
 * Import helper libraries
 */
const schedules = require('../../schedules/controller.js');

const skill = new Skills();
const devicePowerSchema = require('./schema/device_power.json');
const deviceScheduleSchema = require('./schema/device_schedule.json');

/**
 * @type get
 * @path /devices
 */
async function listDevices(req, res, next) {
  serviceHelper.log(
    'trace',
    'Display TP-Link device data API called',
  );

  const devices = [];

  try {
    const client = new Client();

    // Look for devices
    client.startDiscovery().on('device-new', async (device) => {
      const deviceInfo = await device.getSysInfo();
      serviceHelper.log(
        'trace',
        `Found: ${deviceInfo.deviceId}`,
      );
      devices.push({
        deviceHost: device.host,
        deviceID: deviceInfo.deviceId,
        deviceName: deviceInfo.alias,
        status: device.status,
      });
    });

    // timeout discovery and report back devices
    setTimeout(() => {
      client.stopDiscovery();
      serviceHelper.log(
        'info',
        `Found ${devices.length} TL-Link device(s)`,
      );
      serviceHelper.sendResponse(
        res,
        200,
        devices,
      );
      next();
    }, 15000);
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    serviceHelper.sendResponse(
      res,
      500,
      err,
    );
    next();
  }
}
skill.get('/devices', listDevices);

/**
 * @type put
 * @path /devices/:deviceHost
 */
async function updateDevice(req, res, next) {
  serviceHelper.log(
    'trace',
    'Update TP-Link device API called',
  );
  serviceHelper.log(
    'trace',
    JSON.stringify(req),
  );

  try {
    const client = new Client();
    const { deviceHost, power } = req.params;
    const plug = await client.getPlug({ host: deviceHost });
    if (plug instanceof Error) {
      serviceHelper.log(
        'error',
        plug.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          plug,
        );
        next();
      } else {
        return plug;
      }
    }
    const updateResult = await plug.setPowerState(power);
    if (updateResult instanceof Error) {
      serviceHelper.log(
        'error',
        updateResult.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          updateResult,
        );
        next();
      } else {
        return updateResult;
      }
    }
    serviceHelper.log(
      'info',
      `TP-Link device: ${deviceHost} was turned ${power ? 'on' : 'off'}`,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        '{ true }',
      );
      next();
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put(
  '/devices/:deviceHost',
  serviceHelper.validateSchema(devicePowerSchema),
  updateDevice,
);

/**
 * @type get
 * @path /schedules
 */
async function listSchedule(req, res, next) {
  serviceHelper.log(
    'trace',
    'List TP-Link list all schedules API called',
  );
  serviceHelper.log(
    'trace',
    JSON.stringify(req),
  );

  try {
    const sql = 'SELECT name, hour, minute, deviceid, name, action, active FROM tp_link_schedules';
    const dbConnection = await serviceHelper.connectToDB('tplink');
    serviceHelper.log(
      'trace',
      'Get schedule settings',
    );
    const results = await dbConnection.query(sql);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

    if (results.rowCount === 0) {
      // Exit function as no data to process
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.log(
          'info',
          'No tp-link schedule fonud',
        );
        serviceHelper.sendResponse(
          res,
          200, {},
        );
        next();
      } else {
        return new Error('No tp-link schedule fonud');
      }
    }
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        results.rows,
      );
      next();
    } else {
      return results.rows;
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/schedules', listSchedule);

/**
 * @type get
 * @path /schedules/:scheduleID
 */
async function schedule(req, res, next) {
  serviceHelper.log(
    'trace',
    'List TP-Link schedules API called',
  );
  serviceHelper.log(
    'trace',
    JSON.stringify(req),
  );

  const { scheduleID } = req.params;

  // eslint-disable-next-line no-restricted-globals
  if (isNaN(scheduleID)) {
    serviceHelper.log(
      'error',
      'scheduleID is not a number',
    );
    const err = new Error('param: scheduleID is not a number');
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        400,
        err,
      );
      next();
    }
    return err;
  }

  try {
    const sql = `SELECT name, hour, minute, deviceid, name, action, active FROM tp_link_schedules WHERE id = ${scheduleID}`;
    const dbConnection = await serviceHelper.connectToDB('tplink');
    serviceHelper.log(
      'trace',
      'Get schedule settings',
    );
    const results = await dbConnection.query(sql);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

    if (results.rowCount === 0) {
      // Exit function as no data to process
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.log(
          'info',
          'No tp-link schedule fonud',
        );
        serviceHelper.sendResponse(
          res,
          200,
          {},
        );
        next();
      } else {
        return new Error('No tp-link schedule fonud');
      }
    }
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        results.rows,
      );
      next();
    } else {
      return results.rows;
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get(
  '/schedules/:scheduleID',
  serviceHelper.validateSchema(deviceScheduleSchema),
  schedule,
);

/**
 * @type put
 * @path /schedules/:scheduleID
 */
async function updateSchedule(req, res, next) {
  serviceHelper.log(
    'trace',
    'Update TP-Link schedules API called',
  );
  serviceHelper.log(
    'trace',
    JSON.stringify(req),
  );

  const {
    scheduleID,
    name,
    hour,
    minute,
    deviceid,
    action,
    active,
  } = req.params;

  try {
    serviceHelper.log(
      'trace',
      'Read existing values',
    );
    const scheduleData = await schedule({ params: { scheduleID } }, null, null);
    if (scheduleData instanceof Error) {
      serviceHelper.log(
        'error',
        scheduleData.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          scheduleData,
        );
        next();
      } else {
        return scheduleData;
      }
    }

    serviceHelper.log(
      'trace',
      'Update values from params',
    );
    if (typeof name !== 'undefined' && name !== null) scheduleData[0].name = name;
    if (typeof hour !== 'undefined' && hour !== null) scheduleData[0].hour = hour;
    if (typeof minute !== 'undefined' && minute !== null) scheduleData[0].minute = minute;
    if (typeof deviceid !== 'undefined' && deviceid !== null) scheduleData[0].deviceid = deviceid;
    if (typeof action !== 'undefined' && action !== null) scheduleData[0].action = action;
    if (typeof active !== 'undefined' && active !== null) scheduleData[0].active = active;

    serviceHelper.log(
      'trace',
      'Update db',
    );
    const sql = 'UPDATE tp_link_schedules SET name = $2, hour = $3, minute = $4, deviceid = $5, action = $6, active = $7 WHERE id = $1';
    const sqlValues = [
      scheduleID,
      scheduleData[0].name,
      scheduleData[0].hour,
      scheduleData[0].minute,
      scheduleData[0].deviceid,
      scheduleData[0].action,
      scheduleData[0].active,
    ];
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('tplink');
    serviceHelper.log(
      'trace',
      'Get schedule settings',
    );
    const results = await dbConnection.query(sql, sqlValues);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

    // Send data back to caler
    if (results.rowCount === 1) {
      serviceHelper.log(
        'info',
        `Saved schedule data: ${JSON.stringify(req.params)}`,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          200,
          '{ Saved }',
        );
        next();
      } else return true;
      schedules.setSchedule(); // Re-set schedule
    } else if (typeof res !== 'undefined' && res !== null) {
      const err = new Error('Failed to save');
      serviceHelper.log(
        'error',
        err.message,
      );
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return new Error('Failed to save');
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put(
  '/schedules/:scheduleID',
  serviceHelper.validateSchema(deviceScheduleSchema),
  updateSchedule,
);

module.exports = {
  skill,
  updateDevice,
};