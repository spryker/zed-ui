import glob from 'fast-glob';

const dasherize = (value: string): string =>
    value
        .replace(/[\s_]/g, '-')
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();

export const getModuleDirectoryName = (relativeEntryPointPath: string): string => relativeEntryPointPath.split('/')[0];

export const buildEntryPointName = (prefix: string, relativeEntryPointPath: string): string =>
    prefix + dasherize(getModuleDirectoryName(relativeEntryPointPath));

export const expandModuleRootDirectories = async (absoluteDirectoryPattern: string): Promise<string[]> => {
    const directories = await glob(absoluteDirectoryPattern, {
        onlyDirectories: true,
        onlyFiles: false,
        absolute: true,
        unique: true,
        followSymbolicLinks: false,
    });

    return directories.sort();
};

export const findEntryPointFiles = async (moduleRootDirectory: string, entryPointGlob: string): Promise<string[]> => {
    const entryPointPaths = await glob(entryPointGlob, {
        cwd: moduleRootDirectory,
        onlyFiles: true,
        followSymbolicLinks: false,
    });

    return entryPointPaths.sort();
};

export const toConfigurationPathSegments = (configurationPath: string): string[] =>
    configurationPath
        .replace(/^\.\//, '')
        .split('/')
        .filter((segment) => segment.length > 0);

export const joinConfigurationPath = (...configurationPaths: string[]): string =>
    configurationPaths.flatMap(toConfigurationPathSegments).join('/');

// A path template matches a configuration path segment by segment, with `*` standing for exactly one
// segment. It is used both to emit the core-derived paths and to recognise the ones a previous run
// (or a different source layout) emitted, so a stale entry is replaced instead of accumulating.
export const matchesConfigurationPathTemplate = (configurationPath: string, pathTemplate: string): boolean => {
    const pathSegments = toConfigurationPathSegments(configurationPath);
    const templateSegments = toConfigurationPathSegments(pathTemplate);

    return (
        pathSegments.length === templateSegments.length &&
        templateSegments.every(
            (templateSegment, index) => templateSegment === '*' || templateSegment === pathSegments[index],
        )
    );
};

export const resolveCoreModuleFilePath = async (
    absoluteCoreModulesDirectory: string,
    relativeCoreModulesDirectory: string,
    moduleRelativeFilePath: string,
): Promise<string> => {
    const matchedPaths = await glob(`*/${moduleRelativeFilePath}`, {
        cwd: absoluteCoreModulesDirectory,
        onlyFiles: true,
        followSymbolicLinks: false,
    });

    const [firstMatchedPath] = matchedPaths.sort();

    if (firstMatchedPath === undefined) {
        throw new Error(
            `Cannot find "${moduleRelativeFilePath}" in any core module under ` +
                `${absoluteCoreModulesDirectory}.\n` +
                `The Merchant Portal TypeScript configurations reference this core file by a path relative ` +
                `to the project root, and the directory the module is installed into differs per source ` +
                `layout, so the builder has to discover it.\n` +
                `Install the Spryker core modules ("composer install" for a project, "npm install" for the ` +
                `monorepo) and re-run "npm run mp:update:config".\n`,
        );
    }

    return joinConfigurationPath(relativeCoreModulesDirectory, firstMatchedPath);
};
