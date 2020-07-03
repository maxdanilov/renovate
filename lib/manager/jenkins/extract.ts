import * as datasourceJenkins from '../../datasource/jenkins';
import { logger } from '../../logger';
import * as dockerVersioning from '../../versioning/docker';
import { PackageDependency, PackageFile } from '../common';

export function extractPackageFile(content: string): PackageFile | null {
  logger.trace('jenkins.extractPackageFile()');
  const deps: PackageDependency[] = [];

  for (const line of content.split('\n')) {
    const match = /^\s*([\d\w-]+):([^#\s]+).*$/.exec(line);

    if (match) {
      const dep: PackageDependency = {
        datasource: datasourceJenkins.id,
        depName: match[1],
        currentValue: match[2],
        versioning: dockerVersioning.id,
      };

      logger.debug(
        {
          depName: dep.depName,
          currentValue: dep.currentValue,
        },
        'Jenkins plugin'
      );
      deps.push(dep);
    }
  }

  if (!deps.length) {
    return null;
  }
  return { deps };
}
