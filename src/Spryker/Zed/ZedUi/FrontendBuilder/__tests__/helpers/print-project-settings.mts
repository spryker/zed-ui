import { loadProjectBuilderSettings } from '../../settings.mts';

// Run by the project settings tests in a child Node process, so the override file is loaded the way
// the builder loads it: natively, via type stripping, from the project root it runs in.
process.stdout.write(JSON.stringify(await loadProjectBuilderSettings()));
