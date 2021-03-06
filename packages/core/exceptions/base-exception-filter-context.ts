import 'reflect-metadata';
import iterate from 'iterare';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import {
  EXCEPTION_FILTERS_METADATA,
  FILTER_CATCH_EXCEPTIONS,
} from '@nestjs/common/constants';
import {
  isEmpty,
  isFunction,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { Type } from '@nestjs/common/interfaces/index';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { ExceptionFilter } from '@nestjs/common/interfaces/exceptions/exception-filter.interface';
import { RouterProxyCallback } from './../router/router-proxy';
import { ContextCreator } from './../helpers/context-creator';
import { ApplicationConfig } from './../application-config';
import { NestContainer } from '../injector/container';

export class BaseExceptionFilterContext extends ContextCreator {
  protected moduleContext: string;

  constructor(private readonly container: NestContainer) {
    super();
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
  ): R {
    if (isUndefined(metadata) || isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
      .filter(
        instance => instance && (isFunction(instance.catch) || instance.name),
      )
      .map(filter => this.getFilterInstance(filter))
      .map(instance => ({
        func: instance.catch.bind(instance),
        exceptionMetatypes: this.reflectCatchExceptions(instance),
      }))
      .toArray() as R;
  }

  public getFilterInstance(filter: Function | ExceptionFilter) {
    const isObject = !!(filter as ExceptionFilter).catch;
    if (isObject) {
      return filter;
    }
    const instanceWrapper = this.getInstanceByMetatype(filter);
    return instanceWrapper && instanceWrapper.instance
      ? instanceWrapper.instance
      : null;
  }

  public getInstanceByMetatype(filter): { instance: any } | undefined {
    if (!this.moduleContext) {
      return undefined;
    }
    const collection = this.container.getModules();
    const module = collection.get(this.moduleContext);
    if (!module) {
      return undefined;
    }
    return module.injectables.get((filter as any).name);
  }

  public reflectCatchExceptions(instance: ExceptionFilter): Type<any>[] {
    const prototype = Object.getPrototypeOf(instance);
    return (
      Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, prototype.constructor) || []
    );
  }
}
