import {
  DomainEntityMap,
  LocalDatabase,
  OutboxMutation,
  PutOptions,
  RepositoryName,
  RepositoryScope,
} from '../contracts';

export interface LocalEntityMutationInput<Name extends RepositoryName> {
  readonly scope: RepositoryScope;
  readonly repository: Name;
  readonly entity: DomainEntityMap[Name];
  readonly mutation: OutboxMutation;
  readonly putOptions?: PutOptions;
}

export interface LocalEntityMutationResult<Name extends RepositoryName> {
  readonly entity: DomainEntityMap[Name];
  readonly mutation: OutboxMutation;
}

export async function commitLocalEntityMutation<Name extends RepositoryName>(
  database: LocalDatabase,
  input: LocalEntityMutationInput<Name>,
): Promise<LocalEntityMutationResult<Name>> {
  assertMutationMatchesEntity(input);

  return database.transaction(async (transaction) => {
    const entity = await transaction
      .repository(input.repository)
      .put(input.scope, input.entity, input.putOptions);
    const mutation = await transaction.outbox.enqueue(input.mutation);

    return { entity, mutation };
  });
}

function assertMutationMatchesEntity<Name extends RepositoryName>(
  input: LocalEntityMutationInput<Name>,
): void {
  const { mutation, entity, scope } = input;

  if (mutation.repository !== input.repository) {
    throw new Error('Outbox repository does not match the local entity repository');
  }

  if (mutation.entityId !== entity.id) {
    throw new Error('Outbox entity ID does not match the local entity');
  }

  if (mutation.organizationId !== scope.organizationId || mutation.branchId !== scope.branchId) {
    throw new Error('Outbox tenant scope does not match the local entity scope');
  }
}
