'use strict';

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var gcm = require('node-gcm');
var _ = require('lodash');

/**
 * Expose module.
 */

module.exports = Sender;

/**
 * Create a new GCM sender.
 *
 * @param {object} options
 * @param {string} options.apiKey
 * @param {number} options.retries
 */

function Sender(options) {
  EventEmitter.call(this);
  _.extend(this, _.defaults(options || {}, {
    retries: 4
  }));
}

util.inherits(Sender, EventEmitter);

/**
 * Send a notification.
 *
 * @param {object} data
 * @see https://github.com/ToothlessGear/node-gcm
 */

Sender.prototype.send = function (data) {
  var args = Array.prototype.slice.call(arguments, 1);
  var sender = this;
  sender.gcmSender = sender.gcmSender || sender.createGcmSender();

  // Registration id can be string or array.
  if (! _.isArray(data.registrationId)) data.registrationId = [data.registrationId];

  // Create GCM message.
  var message = new gcm.Message(_.omit(data, 'registrationId'));

  sender.gcmSender.send(message, data.registrationId, sender.retries, function (err, res) {
    if (err) return _.each(data.registrationId, function (registrationId) {
        sender.emit.apply(sender, ['transmissionError', err, message, registrationId].concat(args));
      });

    _.each(res.results, function (result, index) {
      if (result.error)
        return sender.emit.apply(sender, ['transmissionError', result.error, message, data.registrationId[index]].concat(args));

      if (result.registration_id)
        sender.emit.apply(sender, ['updated', result, message, data.registrationId[index]].concat(args));

      sender.emit.apply(sender, ['transmitted', result, message, data.registrationId[index]].concat(args));
    });
  });
};

/**
 * Create a new GCM sender.
 *
 * @returns {gcm.Sender}
 */

Sender.prototype.createGcmSender = function () {
  return new gcm.Sender(this.apiKey);
};