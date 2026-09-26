class DomainError(Exception):
    """A business-rule violation.

    The message is read verbatim by the voice agent, so it must say what went wrong, what did
    work, and what to ask the worker next.
    """


class NotFoundError(DomainError):
    pass
