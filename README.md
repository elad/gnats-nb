### Setup

```
$ git clone https://github.com/elad/gnats-nb
$ cd gnats-nb
$ npm install
```

Put the following in a `config.json` file:

```
{
	"url": "http://gnats.netbsd.org/",
	"open_prs_file": "open_prs.txt",
	"github_repository": "github_username/repository",
	"github_token": "your_secret_token"
}
```

* `open_prs_file` is a file containing a list of open PR numbers, just to make things a bit faster
* `github_repository` is what repository to put the converted issues in, for example `elad/gnats-nb`
* `github_token` is your secret GitHub token that allows you to create issues on the above repository

Then you can do

```
$ node convert <random or pr number>
```

Assuming `dummy` is set to `false` in `convert.js`, a new issue will be created. Otherwise, it will be printed to the screen.

