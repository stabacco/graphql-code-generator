# This is my license, dawg

from dataclasses import dataclass


@dataclass
class MyType:
    """ This is my type """

    # This is my real #
    real: int


@dataclass
class ComplexSegment:
    """ A constant segment of a complex-valued function of time. """

    # The duration of the segment. #
    duration: float

    # The value taken by the function on this segment. #
    value: str

    # The matching class in core. #
    _core_type: str


@dataclass
class ComplexSegment22:
    """ A constant segment of a complex-valued function of time. """

    # The duration of the segment. #
    duration: float

    # The value taken by the function on this segment. #
    value: str

    # The matching class in core. #
    _core_type: str


@dataclass
class A:

    a_string: str


@dataclass
class B:
    a: A
    b_string: str
