# kiss.io Contribution Code of Conduct
First of all, thanks for checking out **kiss.io** and getting involved.  
In order to start contributing to the project, please make it easier for all of us
and stick to the following small guide:

#### How to Report an Issue
1. **First of all, make sure that you search for a similar issue first.**
If the search results don't satisfy you, or too old for your matter,
only then consider reporting. Also try to [Google](https://google.com) your
problem, and [search in StackOverflow](http://stackoverflow.com/questions/tagged/kiss.io).
This done to ease with a potential stress of issues and making sure that
you don't file an invaluable issues.
2. **Make sure that the issue isn't caused by a bad code on your part.**
Before reporting an issue, review your code and test it. Make sure you read
the [kiss.io wiki](https://github.com/kissio/kiss.io/wiki) and understand
kiss.io's api correctly.
3. After you've checked for 1 + 2 and still got no answer, feel free to [file a relevant
issue](https://github.com/kissio/kiss.io/issues/new) that everyone can enjoy
from. That means that try to report an issue with as much detail as possible,
add code samples, be nice and respectful in your tone, and make sure that the
issue is generalized enough that others can benefit from it also.

#### How to Send Pull Requests (PRs)
Also read: [Understanding the GitHub Flow](https://guides.github.com/introduction/flow/).

1. Fork this project.
2. Commit desired changes to your fork with quality messages explaining what 
you did.
3. Make sure to run tests and review your changes one more time.
4. Don't break compatibility. As a rule of thumb: make sure that your changes doesn't
conflict with kiss.io's api documentation.
5. Run kiss.io/test dir on your changes (actually travis does it for you)
6. Make sure that your PR pass travis build successfully.
7. Send Pull Requests.

## Don't Know Where to Begin? (TO DO LIST)
- [ ] Improve current tests, make them as thorough as possible.
- [ ] Make `Router` logic faster.
- [ ] Write plugins! everything that serves you can serve others.
- [ ] Write more examples.
- [ ] Write more documentation/fix lacking docs.
- [ ] Propose new features in the [Issues](https://github.com/kissio/kiss.io/issues) section.
- [ ] Make `Server`, `Client`, `Socket` and `Namespace` logic that belongs to connecting
and initiating a connection as seamless and fast as it can.
- [ ] Check for memory leaks.