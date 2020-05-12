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



"""
In defense of code generation

why would you generate code instead of dynamically creating the classes mapping to the datastructures
in memory: 

1) Code can be shipped to various clients, whereas dynamically generated code is only accessible
by the client generating it. This will allow everyone to code agains the same interface and reuse 
the same classes. Such a scenario is preferrable since we can share the same code with different 
departments, such as q-eng and we both can load it in our libraries avoiding code duplication

In fact, q-eng already has implemented simple dataclasses that wrap the data structures. In an ideal scenario
we would be able to generate code that is similar to it and it could both be loaded by q-ctrl core modules 
and the python package 


2) Generated code is "baked", therefore whenever we will be able to more-easily track the versions
of the shipped code. As an example, we update the GraphQL schema, generate a package that gets shipped 
to backend / q-eng / frontend ( there are multiple GraphQL code generators readily available)
This will also give us a way to "track" python packages versions against the schema version.

3) Generated code is "inspectable" and documentation can be generated more easily.

On the minus side

1) More tooling necessary


"""