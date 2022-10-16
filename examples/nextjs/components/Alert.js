import { useState, Fragment } from "react";
import { Transition } from "@headlessui/react";
import {
  XIcon,
  EmojiHappyIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/outline";

export default function Alert({ alertType, alertBody, triggerAlert, color }) {
  const [showAlert, setShowAlert] = useState(triggerAlert);

  return (
    <Transition
      show={showAlert}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:-translate-x-2/4"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div
        className="alert z-50 max-w-lg p-3 w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden"
        style={{ backgroundColor: color }}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            {alertType === "success" ? (
              <EmojiHappyIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium text-gray-900">{alertBody}</p>
          </div>
          <div className="ml-auto pl-3">
            <div className="mx-3.5 -my-1.5">
              <button
                type="button"
                className="inline-flex rounded-md p-1.5 text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-gray-600"
              >
                <span className="sr-only">Dismiss</span>
                <XIcon
                  className="h-5 w-5"
                  aria-hidden="true"
                  onClick={() => {
                    setShowAlert(!showAlert);
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
}
