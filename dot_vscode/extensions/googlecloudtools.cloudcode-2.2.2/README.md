# Cloud Code for Visual Studio Code

Bring the power of Google Cloud and Duet AI to help you build applications
faster and easier than ever before. Duet AI, your AI-powered coding assistant
helps you quickly write excellent code. Cloud Code can then help you deploy your
code to your favorite Google Cloud platforms with just a few clicks.

![Cloud Code demo](https://www.gstatic.com/cloudssh/cloudcode/cloud_code_demo.gif)

# Key Features

## Supporting your development workflow

Get Duet AI, Google Cloud's powerful AI Assistant, to make it easier than ever
to build and deploy applications. Get run-ready sample applications,
out-of-the-box configuration snippets, support for key Google Cloud Services
like Cloud APIs and Google Cloud Build, Cloud Native Buildpacks, Secrets
Manager, one-click deployment, a tailored debugging experience, iterative
run/debug experience and much more. Cloud Code makes developing and testing your
application a whole lot easier no matter where it runs!

<details>
  <summary>Read more</summary>

### Highlights

-   Pick your preferred language with Cloud Code's support for Go, Java,
    Node.js, Python, and .NET Core app development.
-   Get straight to developing with Cloud Code's simplified authentication
    workflow that uses your Google Cloud credentials.
-   Monitor your app with streaming logs and customize the output with
    additional filters to produce results that are meaningful to you.

</details>

## Duet AI Assistant to simplify development

Use Duet AI, your AI-powered collaborator, to accomplish tasks more effectively
and efficiently. Duet AI provides contextualized responses to your prompts to
help guide you on what you're trying to do with your code. It also shares source
citations regarding which documentation and code samples the assistant used to
generate its responses. You can do this right in the IDE to avoid having to
context-switch out to your browser or documentation.
[Read the docs](https://cloud.google.com/duet-ai/docs/overview)

![Duet AI code generation](https://www.gstatic.com/cloudssh/cloudcode/duet_ai_code_generation.gif)

<details>
  <summary>Read more</summary>

### Highlights

-   Through a natural language chat interface, you can quickly chat with Duet AI
    to get answers to cloud questions, or receive guidance on best practices.
-   Whether you are writing apps, calling APIs, or querying data, Duet AI can
    help complete your code while you write, or generate code blocks based on
    comments.
-   Duet AI can help you both generate code (including sharing citations) as
    well as debug code to get your app up and running in no time.
-   As you write functions and applications, Duet AI can also help you generate
    unit tests to help you make your code more robust and increase your test
    coverage, thereby reducing the risk of failures in production.
-   Duet AI can help you with development practices across most popular
    languages. In all Duet AI supports 20+ languages including C, C++, C#, Go,
    Python, Java, JavaScript, Kotlin, TypeScript just to name a few.
-   Duet AI also supports code infrastructure interfaces including gCloud CLI,
    KRM and Terraform making it easy for you to interact with various
    infrastructure layers.

</details>

## Google Cloud APIs at your fingertips

Browse available Cloud APIs, enable services, and install and learn how to
integrate client libraries in your app without leaving your IDE and breaking
your development flow, all with the API library browser.
[Read the docs](https://cloud.google.com/code/docs/vscode/client-libraries)

## Develop Cloud Functions locally

View, download, deploy, and test Cloud Functions directly from Cloud Code.
Leverage the power of the VS Code IDE to make changes to your Cloud Function,
then deploy those changes without ever needing to leave Cloud Code.
[Read the docs](https://cloud.google.com/code/docs/vscode/create-deploy-function)

## Kubernetes development

Create and run a new app in minutes with Cloud Code’s Kubernetes support. Or
work on an existing application, customize its YAML with Cloud Code’s
intelligent authoring support, debug it relentlessly with the setup-free
debugger, and run it on any of your Kubernetes clusters. Whatever your workflow
is, Cloud Code helps you spend less time on configuration and context-switching,
so you can focus on developing your app.
[Read the docs](https://cloud.google.com/code/docs/vscode/k8s-overview)

## Cloud Run development

Create and deploy a new service in minutes with Cloud Code's Cloud Run support,
monitoring your service's progress with the Cloud Run Explorer and service logs
accessible in the Log Viewer. If you'd prefer a local development workflow, you
can also develop and debug a service locally with the built-in Cloud Run
emulator.
[Read the docs](https://cloud.google.com/code/docs/vscode/cloud-run-overview)

## Containerization made easy

Create secure, production-ready container images from source code without having
to worry about a Dockerfile with Cloud Code's built-in support for Google Cloud
Buildpacks. You get to focus on building your application, not containerizing
it.

## Built-in Secret Manager support

Protect sensitive information and keep your app secure with Cloud Code's
integrated Secret Manager support. You can create, view, update, and use secrets
in the Secret Manager view without having them in your codebase.
[Read the docs](https://cloud.google.com/code/docs/vscode/secret-manager)

## Develop using Compute Engine Virtual Machines

Browse Compute Engine Virtual Machines and their relevant properties without
leaving your IDE. Easily SSH into your VM using the terminal window and transfer
files from your local environment to your virtual machine all with Cloud Code
support for Compute Engine.
[Read the docs](https://cloud.google.com/code/docs/vscode/manage-vms)

## Develop APIs with Apigee

Develop your API proxies and verify the functionality through unit and manual
testing using the Apigee Emulator (local runtime). Quickly iterate through build
and test cycles without impact to dependent applications.
[Read the docs](https://cloud.google.com/apigee/docs/api-platform/local-development/overview)

# Resources

-   [Learn more](https://cloud.google.com/code): Learn more about Cloud Code and
    what it has to offer.
-   [Documentation](https://cloud.google.com/code/docs/vscode): Cloud Code has a
    lot of features to explore. Head over to our documentation to discover more.
-   [Talk to us](https://join.slack.com/t/googlecloud-community/shared_invite/zt-erdf4ity-8ZMUQ18DYV~5hkbZ~gCswg):
    Connect to the Cloud Code development team by joining the #cloud-code Slack
    channel
-   [File an issue](https://github.com/GoogleCloudPlatform/cloud-code-vscode/issues/new?assignees=&labels=&template=bug_report.md&title=):
    If you discover an issue, file a bug and we'll fix it as soon as possible.
-   [Request a feature](https://github.com/GoogleCloudPlatform/cloud-code-vscode/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=):
    If you have any feature requests, ideas for improvement, and general
    feedback, submit a feature request.

## Security Disclosures

Please see our [security disclosure process](https://github.com/GoogleCloudPlatform/cloud-code-vscode/blob/HEAD/SECURITY.md). All
[security advisories](https://github.com/GoogleCloudPlatform/cloud-code-vscode/security/advisories)
are managed on Github.

*Apache Log4j 2 Vulnerability (Log4j 2):* the Cloud Code guide to
[*"Setting up a samples repository"*](https://cloud.google.com/code/docs/vscode/set-up-sample-repo)
linked to a demonstration project with a sample using a vulnerable version of
Log4j 2. We strongly advise customers to update their samples repositories.
Visit the
[security advisory](https://github.com/GoogleCloudPlatform/cloud-code-vscode/security/advisories/GHSA-3ghm-xvvq-qqh6)
for details and remediation.

Cloud Code telemetry overall is handled in accordance with the Google Privacy
Policy. When you use Cloud Code to interact with or utilize GCP Services
(including via Cloud SDK), your information is handled in accordance with the
[Google Cloud Privacy Notice](https://cloud.google.com/terms/cloud-privacy-notice)
