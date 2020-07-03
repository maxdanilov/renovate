import { logger } from '../../logger';
import { ExternalHostError } from '../../types/errors/external-host-error';
import { Http } from '../../util/http';
import { Release, ReleaseResult } from '../common';
import { id } from './common';

const http = new Http(id);
const cacheTimeMin = 60;

const packageInfoUrl =
  'https://updates.jenkins.io/current/update-center.actual.json';

let lastSync = new Date('2000-01-01');
let packageReleases: Record<string, ReleaseResult> = Object.create(null);

// Note: use only for tests
export function resetCache(): void {
  lastSync = new Date('2000-01-01');
  packageReleases = Object.create(null);
}

function processPlugin(name: string, data: Record<string, any>): void {
  const pluginReleases: Release[] = [data?.previousVersion, data?.version]
    .filter((x) => x !== null && x !== undefined)
    .map((x) => {
      return { version: x };
    });

  packageReleases[name] = {
    name,
    releases: pluginReleases,
    sourceUrl: data?.scm,
  };
}

async function updateJenkinsPluginVersions(): Promise<void> {
  const options = {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
    },
  };
  let body: string;

  try {
    logger.debug('Jenkins: Fetching Jenkins plugins versions');
    let startTime = Date.now();

    body = JSON.parse((await http.get(packageInfoUrl, options)).body);
    let durationMs = Math.round(Date.now() - startTime);
    logger.debug({ durationMs }, 'Jenkins: Fetched Jenkins plugins versions');

    startTime = Date.now();
    durationMs = Math.round(Date.now() - startTime);
    logger.debug({ durationMs }, 'Jenkins: Parsed Jenkins plugins list');
  } catch (err) /* istanbul ignore next */ {
    packageReleases = Object.create(null);
    throw new ExternalHostError(
      new Error('Jenkins: Fetch error - need to reset cache')
    );
  }

  if (body) {
    const pluginsData: Record<string, any> = ((body as unknown) as Record<
      string,
      any
    >).plugins;

    for (const pluginName in pluginsData) {
      if (Object.prototype.hasOwnProperty.call(pluginsData, pluginName)) {
        processPlugin(pluginName, pluginsData[pluginName]);
      }
    }
  }

  lastSync = new Date();
}

function isDataStale(): boolean {
  const minutesElapsed = Math.floor(
    (new Date().getTime() - lastSync.getTime()) / (60 * 1000)
  );
  return minutesElapsed >= cacheTimeMin;
}

let _updateJenkinsPluginVersions: Promise<void> | undefined;

async function syncVersions(): Promise<void> {
  if (isDataStale()) {
    _updateJenkinsPluginVersions =
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      _updateJenkinsPluginVersions || updateJenkinsPluginVersions();
    await _updateJenkinsPluginVersions;
    _updateJenkinsPluginVersions = null;
  }
}

export async function getJenkinsPluginDependency(
  lookupName: string
): Promise<ReleaseResult | null> {
  logger.debug(`getJenkinsDependency(${lookupName})`);
  await syncVersions();
  if (!packageReleases[lookupName]) {
    return null;
  }

  return packageReleases[lookupName];
}
