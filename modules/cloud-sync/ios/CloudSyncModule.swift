import ExpoModulesCore
import CloudKit

// Phase 2a: the smallest end-to-end slice — prove the native bridge + the
// iCloud/CloudKit entitlement are wired by reporting the user's iCloud account
// status. No syncing yet; that's Phase 2c (CKSyncEngine).
public class CloudSyncModule: Module {
  // Must match the iCloud container declared in the app entitlements
  // (ios.entitlements in app.json).
  private let containerIdentifier = "iCloud.com.omertally.app"

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
