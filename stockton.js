var fs = require('fs'),
    _ = require('underscore');

function remove_empty_lines(s) {
	var lines = s.split('\n'),
	    non_empty_lines = [];
	for (var i = 0, _len = lines.length; i < _len; i++) {
		var line = lines[i].trim();
		if (line) {
			non_empty_lines.push(lines[i]);
		}
	}
	return non_empty_lines.join('\n');
}

// Detect if a string contains a diff.
function has_diff(s) {
	if (!s) {
		return false;
	}

	lines = s.split('\n');

	for (var i = 0, _len = lines.length; i < _len; i++) {
		var a = lines[i],
		    b = lines[i + 1];
		if (!a || !b) {
			continue;
		}

		var idx = a.indexOf('--- ');
		if (idx !== -1 && idx === b.indexOf('+++ ')) {
			return true;
		}
		idx = a.indexOf('*** ');
		if (idx !== -1 && idx === b.indexOf('--- ')) {
			return true;
		}
	}

	return false;
}
exports.has_diff = has_diff;

// Detect if a fix is real.
function has_fix(s) {
	if (!s) {
		return false;
	}

	var signs_this_is_not_a_real_fix = [
		'n/a',
		'unknown',
		'no idea',
		'no clue',
		'don\'t know',
		'dunno'
	];
	s = s.toLowerCase().trim();
	if (!s) {
		return false;
	}
	for (var i = 0, _len = signs_this_is_not_a_real_fix.length; i < _len; i++) {
		if (s.indexOf(signs_this_is_not_a_real_fix[i]) !== -1) {
			return false;
		}
	}

	return true;
}
exports.has_fix = has_fix;

// Detect if a string contains a backtrace.
function has_backtrace(s) {
	if (!s) {
		return false;
	}

	var ddb_trace = /[A-Za-z0-9_]+\(.+ at [A-Za-z0-9_]+:[A-Za-z0-9_]+\+0x./,
	    gdb_trace = /#[0-9]+ 0x[A-Fa-f0-9]+ in /;
	return (s.indexOf('> bt') !== -1 || s.match(ddb_trace) || s.match(gdb_trace)) ? true : false;
}
exports.has_backtrace = has_backtrace;

// Detect if a string contains a build failure.
function has_build_failure(s) {
	if (!s) {
		return false;
	}

	var signs = [
		'build fail',
		'doesn\'t build',
		'fails to build',
		'make: stopped',
		'*** Error code',
		'ld: fatal'
	];

	s = s.toLowerCase();

	for (var i = 0, _len = signs.length; i < _len; i++) {
		if (s.indexOf(signs[i]) !== -1) {
			return true;
		}
	}

	return false;
}
exports.has_build_failure = has_build_failure;

// Detect if a string is considered to be brief.
var brief_size = 256;
function is_brief(s) {
	if (!s) {
		return true;
	}

	return (s.length <= brief_size);
}
exports.is_brief = is_brief;

// Detect if a string is considered to be exhausting.
var exhausting_size = 4096;
function is_exhausting(s) {
	if (!s) {
		return true;
	}

	return (s.length <= exhausting_size);
}
exports.is_exhausting = is_exhausting;

function has_panic(s) {
	if (!s) {
		return false;
	}

	return (s.toLowerCase().indexOf('panic') !== -1) ? true : false;
}
exports.has_panic = has_panic;

// Load some templates.
_.extend(_.templateSettings, { variable: 'data' });
var template_metadata = _.template(fs.readFileSync('templates/metadata.txt', { encoding: 'utf-8' })),
    template_raw = _.template(fs.readFileSync('templates/raw.txt', { encoding: 'utf-8' }));

// TODO: This could use templates.
function prettify(pr) {
	var description = '';

	// Metadata (list).
	var s = template_metadata({
		pr_number: pr.number,
		originator: pr.originator,
		arrival_date: pr.arrival_date,
		last_modified: pr.last_modified,
		environment: pr.environment.trim().replace(/\n/g, ' ')
	});
	description += remove_empty_lines(s) + '\n\n';

	// Description
	s = template_raw({
		title: 'Description',
		body: pr.description
	});
	description += s + '\n\n';

	// How to repeat
	if (pr.how_to_repeat && pr.how_to_repeat.trim()) {
		s = template_raw({
			title: 'How to repeat',
			body: pr.how_to_repeat
		});
		description += s + '\n\n';
	}

	// Fix
	if (pr.fix && has_fix(pr.fix)) {
		s = template_raw({
			title: 'Fix',
			body: pr.fix
		});
		description += s + '\n\n';
	}

	// Audit trail
	if (pr.audit_trail && pr.audit_trail.trim()) {
		s = template_raw({
			title: 'Audit trail',
			body: pr.audit_trail
		});
		description += s + '\n\n';
	}

	// Unformatted
	if (pr.unformatted && pr.unformatted.trim()) {
		s = template_raw({
			title: 'Unformatted',
			body: pr.unformatted
		});
		description += s + '\n\n';
	}

	return description;
}
exports.prettify = prettify;