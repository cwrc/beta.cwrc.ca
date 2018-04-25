Raven Sentry client for Drupal
==============================

[![Build Status](https://travis-ci.org/mfb/raven.svg)](https://travis-ci.org/mfb/raven)

Raven module integrates the
[Sentry-php](https://github.com/getsentry/sentry-php) and
[Raven.js](https://github.com/getsentry/raven-js) clients for
[Sentry](https://sentry.io/) into Drupal.

[Sentry](https://sentry.io/) is a realtime event logging and aggregation
platform. It specializes in monitoring errors and extracting all the information
needed to do a proper post-mortem without any of the hassle of the standard user
feedback loop.


## Features

This module logs errors in a few ways:

* Register error handler for uncaught exceptions
* Register error handler for PHP errors
* Register error handler for fatal errors
* Handle watchdog messages
* Handle JavaScript exceptions via Raven.js.

You can choose which errors you want to catch by enabling
desired error handlers and selecting error levels.


## Installation for Drupal 7

Download and install the [Libraries API 2](http://drupal.org/project/libraries)
module, [X Autoload 5](http://drupal.org/project/xautoload) module, and the
Raven module as normal. Then download the
[Sentry-php client library](https://github.com/getsentry/sentry-php/releases),

Unpack and rename the Sentry library directory to `sentry-php` and
place it inside the `sites/all/libraries` directory.
Make sure the path to the library files
becomes like this: `sites/all/libraries/sentry-php/lib/Raven/Client.php`.

Optionally download [Raven.js](https://github.com/getsentry/raven-js/releases),
unpack and place inside the `sites/all/libraries` directory, renaming the
directory to `raven-js`.


## Dependencies

* The [Sentry-php client library](https://github.com/getsentry/sentry-php)
installed in `sites/all/libraries`
* [Libraries API 2](http://drupal.org/project/libraries)
* [X Autoload 5](http://drupal.org/project/xautoload)
* Optional: [Raven.js](https://github.com/getsentry/raven-js)
installed in `sites/all/libraries`


## Information for developers

You can attach an extra information to error reports (logged in user details,
modules versions, etc). See `raven.api.php` for examples.


## Known issues

If you have code that generates thousands of PHP notices—for example processing
a large set of data, with one notice for each item—you may find that storing and
sending the errors to Sentry requires a large amount of memory and execution
time, enough to exceed your configured memory_limit and max_execution_time
settings. This could result in a stalled or failed request. The work-around for
this case would be to disable sending PHP notices to Sentry.


## Sponsors

This project was originally sponsored by [Seenta](http://seenta.ru/) and is
now sponsored by [EFF](https://www.eff.org/).
