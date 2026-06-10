import ExpoModulesCore
import CloudKit

// CloudKit bridge for Tally's iCloud sync.
//  - Phase 2a: accountStatus() — proves the entitlement + bridge are wired.
//  - Phase 2b: push() — one-way upload of locally-changed records to the
//    user's private database (a custom zone). Pull/conflict come in Phase 2c.
public class CloudSyncModule: Module {
  // Must match the iCloud container declared in app entitlements (app.json).
  private let containerIdentifier = "iCloud.com.omertally.app"
  private let zoneName = "TallyZone"

  public func definition() -> ModuleDefinition {
    Name("CloudSync")

    AsyncFunction("accountStatus") { (promise: Promise) in
      CKContainer(identifier: self.containerIdentifier).accountStatus { status, error in
        if let error = error {
          promise.reject("ERR_ICLOUD_STATUS", error.localizedDescription)
          return
        }
        promise.resolve(CloudSyncModule.statusString(status))
      }
    }

    // upserts: [{ recordType, recordName, fields: { ... } }], deletes: [recordName]
    AsyncFunction("push") { (upserts: [[String: Any]], deletes: [String], promise: Promise) in
      self.push(upserts: upserts, deletes: deletes, promise: promise)
    }

    // Fetch changes from the zone since the given (base64) server change token.
    // Resolves { changes, deletions, token }.
    AsyncFunction("pull") { (tokenBase64: String?, promise: Promise) in
      self.pull(tokenBase64: tokenBase64, promise: promise)
    }
  }

  private func push(upserts: [[String: Any]], deletes: [String], promise: Promise) {
    let db = CKContainer(identifier: containerIdentifier).privateCloudDatabase
    let zone = CKRecordZone(zoneName: zoneName)

    // Ensure the custom zone exists before saving records into it.
    let zoneOp = CKModifyRecordZonesOperation(
      recordZonesToSave: [zone], recordZoneIDsToDelete: nil)
    zoneOp.modifyRecordZonesResultBlock = { result in
      switch result {
      case .failure(let error):
        promise.reject("ERR_ZONE", error.localizedDescription)
      case .success:
        self.saveRecords(
          db: db, zoneID: zone.zoneID, upserts: upserts, deletes: deletes, promise: promise)
      }
    }
    db.add(zoneOp)
  }

  private func saveRecords(
    db: CKDatabase, zoneID: CKRecordZone.ID,
    upserts: [[String: Any]], deletes: [String], promise: Promise
  ) {
    var toSave: [CKRecord] = []
    for item in upserts {
      guard let type = item["recordType"] as? String,
        let name = item["recordName"] as? String
      else { continue }
      let record = CKRecord(
        recordType: type, recordID: CKRecord.ID(recordName: name, zoneID: zoneID))
      if let fields = item["fields"] as? [String: Any] {
        for (key, value) in fields {
          CloudSyncModule.setField(record, key, value)
        }
      }
      toSave.append(record)
    }
    let toDelete = deletes.map { CKRecord.ID(recordName: $0, zoneID: zoneID) }

    let op = CKModifyRecordsOperation(recordsToSave: toSave, recordIDsToDelete: toDelete)
    op.savePolicy = .allKeys
    op.modifyRecordsResultBlock = { result in
      switch result {
      case .failure(let error):
        promise.reject("ERR_PUSH", error.localizedDescription)
      case .success:
        promise.resolve(["saved": toSave.count, "deleted": toDelete.count])
      }
    }
    db.add(op)
  }

  private func pull(tokenBase64: String?, promise: Promise) {
    let db = CKContainer(identifier: containerIdentifier).privateCloudDatabase
    let zone = CKRecordZone(zoneName: zoneName)

    // Ensure the zone exists — nothing to pull from one that was never created.
    let zoneOp = CKModifyRecordZonesOperation(
      recordZonesToSave: [zone], recordZoneIDsToDelete: nil)
    zoneOp.modifyRecordZonesResultBlock = { result in
      switch result {
      case .failure(let error):
        promise.reject("ERR_ZONE", error.localizedDescription)
      case .success:
        self.fetchChanges(
          db: db, zoneID: zone.zoneID, tokenBase64: tokenBase64, promise: promise)
      }
    }
    db.add(zoneOp)
  }

  private func fetchChanges(
    db: CKDatabase, zoneID: CKRecordZone.ID, tokenBase64: String?, promise: Promise
  ) {
    let config = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
    config.previousServerChangeToken = CloudSyncModule.decodeToken(tokenBase64)

    let op = CKFetchRecordZoneChangesOperation(
      recordZoneIDs: [zoneID], configurationsByRecordZoneID: [zoneID: config])

    var changes: [[String: Any]] = []
    var deletions: [[String: String]] = []
    var newToken: CKServerChangeToken?

    op.recordWasChangedBlock = { _, result in
      if case .success(let record) = result {
        changes.append(CloudSyncModule.serialize(record))
      }
    }
    op.recordWithIDWasDeletedBlock = { recordID, recordType in
      deletions.append(["recordName": recordID.recordName, "recordType": recordType])
    }
    op.recordZoneFetchResultBlock = { _, result in
      if case .success(let (token, _, _)) = result {
        newToken = token
      }
    }
    op.fetchRecordZoneChangesResultBlock = { result in
      switch result {
      case .failure(let error):
        promise.reject("ERR_PULL", error.localizedDescription)
      case .success:
        promise.resolve([
          "changes": changes,
          "deletions": deletions,
          "token": CloudSyncModule.encodeToken(newToken).map { $0 as Any } ?? NSNull(),
        ])
      }
    }
    db.add(op)
  }

  // CKRecord → { recordType, recordName, fields }. Only the value types we store
  // (strings, numbers) are read back.
  private static func serialize(_ record: CKRecord) -> [String: Any] {
    var fields: [String: Any] = [:]
    for key in record.allKeys() {
      if let s = record[key] as? String {
        fields[key] = s
      } else if let n = record[key] as? NSNumber {
        fields[key] = n
      }
    }
    return [
      "recordType": record.recordType,
      "recordName": record.recordID.recordName,
      "fields": fields,
    ]
  }

  private static func encodeToken(_ token: CKServerChangeToken?) -> String? {
    guard let token = token,
      let data = try? NSKeyedArchiver.archivedData(
        withRootObject: token, requiringSecureCoding: true)
    else { return nil }
    return data.base64EncodedString()
  }

  private static func decodeToken(_ base64: String?) -> CKServerChangeToken? {
    guard let base64 = base64, let data = Data(base64Encoded: base64) else { return nil }
    return try? NSKeyedUnarchiver.unarchivedObject(
      ofClass: CKServerChangeToken.self, from: data)
  }

  // JS values arrive bridged as NSString / NSNumber (or Swift natives); map them
  // to CKRecordValue. Nulls / unsupported types are skipped.
  private static func setField(_ record: CKRecord, _ key: String, _ value: Any) {
    if let s = value as? String {
      record[key] = s as NSString
    } else if let n = value as? NSNumber {
      record[key] = n
    } else if let b = value as? Bool {
      record[key] = NSNumber(value: b)
    } else if let d = value as? Double {
      record[key] = NSNumber(value: d)
    } else if let i = value as? Int {
      record[key] = NSNumber(value: i)
    }
  }

  private static func statusString(_ status: CKAccountStatus) -> String {
    switch status {
    case .available: return "available"
    case .noAccount: return "noAccount"
    case .restricted: return "restricted"
    case .couldNotDetermine: return "couldNotDetermine"
    case .temporarilyUnavailable: return "temporarilyUnavailable"
    @unknown default: return "unknown"
    }
  }
}
