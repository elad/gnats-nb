var fs = require('fs'),
    async = require('async'),
    request = require('request'),
    github = require('octonode'),
    _ = require('underscore'),
    gnats = require('gnats'),
    stockton = require('./stockton');

// Set this to false to actually add things to GitHub.
var dummy = true;

var config = JSON.parse(fs.readFileSync('config.json', { encoding: 'ascii' }));

// List of open PRs.
var open_prs_file = config.open_prs_file,
    open_prs = fs.readFileSync(open_prs_file, { encoding: 'ascii' }).split('\n');
// Get random PR number.
function random_pr_number() {
	return open_prs[_.random(0, open_prs.length)];
}

// Convert a PR object to a GitHub issue.
function pr_to_issue(pr) {
	// The existing fields are not very helpful.
	var labels = [/*pr.category, pr.severity, pr.priority, pr.class*/];

	if (stockton.has_fix(pr.fix)) {
		labels.push('has fix');
	}
	if (stockton.has_diff(pr.description) || stockton.has_diff(pr.fix) || stockton.has_diff(pr.audit_trail) || stockton.has_diff(pr.unformatted)) {
		labels.push('has diff');
	}
	if (stockton.has_backtrace(pr.description) || stockton.has_backtrace(pr.fix)) {
		labels.push('has backtrace');
	}
	if (stockton.has_panic(pr.description)) {
		labels.push('panic');
	}
	if (stockton.has_build_failure(pr.description)) {
		labels.push('has build failure');
	}

	// Low hanging fruit is a brief report that has a diff or has no panic and a brief fix.
	if (stockton.is_brief(pr.description) &&
	    (!stockton.is_exhausting(pr.audit_trail) && !stockton.is_exhausting(pr.unformatted) && !stockton.is_exhausting(pr.fix)) &&
	    (labels.indexOf('has diff') !== -1 || (labels.indexOf('panic') === -1 && stockton.is_brief(pr.fix)))) {
		labels.push('low hanging fruit');
	}

	var issue = {
		title: pr.synopsis,
		body: stockton.prettify(pr),
		labels: labels,
	};

	return issue;
}

// Create GitHub repository client for creating issues.
var gh = github.client(config.github_token),
    ghrepo = gh.repo(config.github_repository);

function main() {
	var pr_number,
	    n;

	if (process.argv[2] === 'random') {
		n = Number(process.argv[2]) || 1;
	} else {
		n = 1;
		pr_number = Number(process.argv[2]);
		if (!pr_number || isNaN(pr_number)) {
			console.log('please specify a PR number or \'random\'');
			return;
		}
	}

	async.times(n, function(i, callback) {
		async.waterfall([
			function(callback) {
				// If we don't have a PR, get a random one for us to work on.
				pr_number = pr_number || random_pr_number();
				console.log('Fetching PR/' + pr_number + '...');
				gnats.fetch(config.url + pr_number, callback);
			},
			function(pr_text, callback) {
				// Convert the PR to something we can work with.
				var pr = gnats.parse(pr_text),
				    issue = pr_to_issue(pr);

				if (dummy) {
					//console.log(pr);
					console.log(issue);
					return callback();
				}

				// Add an issue for that PR.
				ghrepo.issue(issue, callback);
			},
			function(issue, headers, callback) {
				if (!callback) {
					callback = issue;
				}

				console.log('Done.');

				callback();
			},
		], callback);
	}, function(err) {
		// nothing
	});
}

main();