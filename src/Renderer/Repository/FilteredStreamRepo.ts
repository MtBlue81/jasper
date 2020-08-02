import {DBIPC} from '../../IPC/DBIPC';
import {DateUtil} from '../Util/DateUtil';
import {StreamEntity} from '../Type/StreamEntity';
import {IssueRepo} from './IssueRepo';
import {FilteredStreamEntity} from '../Type/StreamEntity';

class _FilteredStreamRepo {
  private async relations(filteredStreams: FilteredStreamEntity[]) {
    if (!filteredStreams.length) return;
    await this.relationDefaultFilter(filteredStreams);
    await this.relationUnreadCount(filteredStreams);
  }

  private async relationDefaultFilter(filteredSteams: FilteredStreamEntity[]) {
    filteredSteams.forEach(s => s.defaultFilter = 'is:unarchived');
  }

  private async relationUnreadCount(filteredStreams: FilteredStreamEntity[]) {
    const promises = filteredStreams.map(s => IssueRepo.getUnreadCountInStream(s.stream_id, s.defaultFilter, s.filter));
    const results = await Promise.all(promises);
    const error = results.find(res => res.error)?.error;
    if (error) return;

    filteredStreams.forEach((s, index) => s.unreadCount = results[index].count);
  }

  async getAllFilteredStreams(): Promise<{error?: Error; filteredStreams?: FilteredStreamEntity[]}> {
    const {error, rows: filteredStreams} = await DBIPC.select<FilteredStreamEntity>('select * from filtered_streams order by position');
    if (error) return {error};

    await this.relations(filteredStreams);
    return {filteredStreams};
  }

  async createFilteredStream(stream: StreamEntity, name: string, filter: string, notification: number, color: string): Promise<{error?: Error}> {
    const streamId = stream.id;
    const createdAt = DateUtil.localToUTCString(new Date());
    const position = stream.position;

    const {error} = await DBIPC.exec(
      'insert into filtered_streams (stream_id, name, filter, notification, color, created_at, updated_at, position) values(?, ?, ?, ?, ?, ?, ?, ?)',
      [streamId, name, filter, notification, color, createdAt, createdAt, position]
    );
    if (error) return {error};

    return {};
  }

  async updateFilteredStream(filteredStreamId: number, name: string, filter: string, notification: number, color: string): Promise<{error?: Error}> {
    const updatedAt = DateUtil.localToUTCString(new Date());

    const {error} = await DBIPC.exec(
      'update filtered_streams set name = ?, filter = ?, notification = ?, color = ?, updated_at = ? where id = ?',
      [name, filter, notification, color, updatedAt, filteredStreamId]
    );
    if (error) return {error};

    return {};
  }

  async updatePosition(filteredStreams: FilteredStreamEntity[]): Promise<{error?: Error}> {
    const promises = [];
    for (const stream of filteredStreams) {
      const p = DBIPC.exec('update filtered_streams set position = ? where id = ?', [stream.position, stream.id]);
      promises.push(p);
    }

    const results = await Promise.all(promises) as {error?: Error}[];
    const error = results.find(res => res.error)?.error;
    if (error) return {error};

    return {};
  }

  async deleteFilteredStream(filteredStreamId: number): Promise<{error?: Error}> {
    const {error} = await DBIPC.exec('delete from filtered_streams where id = ?', [filteredStreamId]);
    if (error) return {error};
    return {};
  }
}

export const FilteredStreamRepo = new _FilteredStreamRepo();