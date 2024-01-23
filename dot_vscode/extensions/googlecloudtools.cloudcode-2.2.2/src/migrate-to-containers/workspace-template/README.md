# Migrate to Containers workspace

This guide will show you how to migrate your application component from a VM to
a container.

To learn more about Migrate to Containers see the
[official documentation](https://cloud.google.com/migrate/containers/docs/m2c-cli/architecture)

## Prerequisites

*   A VM running your application component
*   The
    [Migrate to Containers](https://cloud.google.com/migrate/containers/docs/m2c-cli/prepare-for-migration)
    tool

## Instructions

1.  [Optional] Set up copy filters. The `filters.txt` file contains
    [rsync format](https://download.samba.org/pub/rsync/rsync.1#FILTER_RULES)
    filters that can help you reduce the size of the copied filesystem, and the
    time the operation takes to run. Edit it to exclude large directories which
    do not contain data relevant to the current migration.

2.  Copy the data from your VM to the workspace. You can run the preconfigured
    `m2c: Copy` vscode task.

    Or simply execute:

    ```sh
    make copy
    ```

3.  Analyze the data and generate a migration plan. The analyze step will
    analyze the data in the workspace and generate a migration plan.

    To execute the analyze step, You can run the preconfigured `m2c: Analyze`
    vscode task.

    Or simply execute:

    ```sh
    make analyze
    ```

    The command creates a directory named `migration-plan` that contains the
    results of the analysis.

    To configure the next step, edit the migration plan, located in
    `migration-plan/config.yaml`.

4.  Generate the artifacts. You can run the preconfigured `m2c: Generate` vscode
    task.

    Or simply execute:

    ```sh
    make generate
    ```

    The artifacts will be generated in the `src/` directory.

5.  Deploy the artifacts to Kubernetes.

    After the artifacts are generated, you can deploy them using skaffold or by
    using the `Run on Kubernetes` action in Cloud Code.

    Or simply execute: `sh cd src skaffold run -d <CONTAINER_REGISTRY>`

### Configuration

The workspace contains a `m2c-config.mk` file which contains user configurable
values. These include the connection details and selected plugin.

### Troubleshooting

If you encounter any problems, please refer to the Migrate to Containers
troubleshooting guide. If you have any questions or want to provide feedback,
send an email to <m2c-feedback-external@google.com>.
